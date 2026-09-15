using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using Microsoft.Extensions.Options;

namespace backend.Events;

/// <summary>
/// BackgroundService que consome o canal de eventos e faz POST JSON para cada destino configurado
/// em "Webhooks:Destinos". Retry exponencial por destino, assinatura HMAC-SHA256 e logs de sucesso/falha.
/// Falhas de destino nunca derrubam a API: são apenas logadas.
/// </summary>
public sealed class WebhookDispatcher : BackgroundService
{
    public const string HttpClientNome = "webhooks";

    private readonly ChannelReader<EventoEnvelope> _reader;
    private readonly IHttpClientFactory _httpFactory;
    private readonly IOptionsMonitor<WebhooksOptions> _opcoes;
    private readonly ILogger<WebhookDispatcher> _logger;

    private readonly object _lock = new();
    private readonly HashSet<Task> _emAndamento = new();
    private readonly SemaphoreSlim _semaforo;

    public WebhookDispatcher(
        Channel<EventoEnvelope> canal,
        IHttpClientFactory httpFactory,
        IOptionsMonitor<WebhooksOptions> opcoes,
        ILogger<WebhookDispatcher> logger)
    {
        _reader = canal.Reader;
        _httpFactory = httpFactory;
        _opcoes = opcoes;
        _logger = logger;
        _semaforo = new SemaphoreSlim(Math.Max(1, opcoes.CurrentValue.MaxEntregasSimultaneas));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var cfg = _opcoes.CurrentValue;
        _logger.LogInformation("WebhookDispatcher iniciado com {Qtd} destino(s) configurado(s): {Nomes}",
            cfg.Destinos.Count, string.Join(", ", cfg.Destinos.Select(d => d.Nome)));

        try
        {
            await foreach (var envelope in _reader.ReadAllAsync(stoppingToken))
            {
                var atual = _opcoes.CurrentValue;
                if (!atual.Habilitado)
                {
                    _logger.LogDebug("Webhooks desabilitados; evento {Tipo} {DeliveryId} descartado", envelope.Tipo, envelope.Id);
                    continue;
                }

                var destinos = atual.Destinos.Where(d => d.AceitaEvento(envelope.Tipo)).ToList();
                if (destinos.Count == 0)
                {
                    _logger.LogDebug("Nenhum destino inscrito em {Tipo}; evento {DeliveryId} ignorado", envelope.Tipo, envelope.Id);
                    continue;
                }

                var corpo = JsonSerializer.SerializeToUtf8Bytes(envelope, EventoService.JsonOpcoes);

                foreach (var destino in destinos)
                {
                    await _semaforo.WaitAsync(stoppingToken);
                    var tarefa = EntregarComRetryAsync(destino, envelope, corpo, atual, stoppingToken);
                    Registrar(tarefa);
                    _ = tarefa.ContinueWith(_ => _semaforo.Release(), TaskScheduler.Default);
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // encerramento normal
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "WebhookDispatcher encerrou inesperadamente");
        }

        // Dá uma chance às entregas em andamento antes de encerrar.
        Task[] pendentes;
        lock (_lock) pendentes = _emAndamento.ToArray();
        if (pendentes.Length > 0)
            await Task.WhenAny(Task.WhenAll(pendentes), Task.Delay(TimeSpan.FromSeconds(5), CancellationToken.None));
    }

    private void Registrar(Task tarefa)
    {
        lock (_lock) _emAndamento.Add(tarefa);
        tarefa.ContinueWith(t => { lock (_lock) _emAndamento.Remove(t); }, TaskScheduler.Default);
    }

    private async Task EntregarComRetryAsync(
        WebhookDestino destino, EventoEnvelope envelope, byte[] corpo, WebhooksOptions cfg, CancellationToken ct)
    {
        if (!Uri.TryCreate(destino.Url, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            _logger.LogWarning("Destino {Destino} tem URL inválida ({Url}); evento {DeliveryId} não enviado",
                destino.Nome, destino.Url, envelope.Id);
            return;
        }

        var delays = cfg.RetryDelaysEfetivos;
        var totalTentativas = delays.Length + 1;
        string? assinatura = string.IsNullOrEmpty(destino.Segredo) ? null : Assinar(destino.Segredo, corpo);

        for (var tentativa = 1; tentativa <= totalTentativas; tentativa++)
        {
            var (sucesso, detalhe, repetir) = await TentarAsync(uri, destino, envelope, corpo, assinatura, ct);

            if (sucesso)
            {
                _logger.LogInformation("Webhook {Destino} <- {Tipo} {DeliveryId} entregue (tentativa {Tentativa}/{Total}, {Detalhe})",
                    destino.Nome, envelope.Tipo, envelope.Id, tentativa, totalTentativas, detalhe);
                return;
            }

            var ultima = tentativa == totalTentativas || !repetir || ct.IsCancellationRequested;
            if (ultima)
            {
                _logger.LogError("Webhook {Destino} <- {Tipo} {DeliveryId} FALHOU definitivamente após {Tentativa} tentativa(s): {Detalhe}",
                    destino.Nome, envelope.Tipo, envelope.Id, tentativa, detalhe);
                return;
            }

            var espera = TimeSpan.FromSeconds(Math.Max(0, delays[tentativa - 1]));
            _logger.LogWarning("Webhook {Destino} <- {Tipo} {DeliveryId} falhou (tentativa {Tentativa}/{Total}): {Detalhe}. Nova tentativa em {Espera}s",
                destino.Nome, envelope.Tipo, envelope.Id, tentativa, totalTentativas, detalhe, espera.TotalSeconds);

            try { await Task.Delay(espera, ct); }
            catch (OperationCanceledException) { return; }
        }
    }

    private async Task<(bool Sucesso, string Detalhe, bool Repetir)> TentarAsync(
        Uri uri, WebhookDestino destino, EventoEnvelope envelope, byte[] corpo, string? assinatura, CancellationToken ct)
    {
        try
        {
            var http = _httpFactory.CreateClient(HttpClientNome);

            using var req = new HttpRequestMessage(HttpMethod.Post, uri);
            req.Content = new ByteArrayContent(corpo);
            req.Content.Headers.ContentType = new("application/json") { CharSet = "utf-8" };
            req.Headers.TryAddWithoutValidation("User-Agent", "AtosCapital-Chamados-Webhook/1.0");
            req.Headers.TryAddWithoutValidation("X-Atos-Event", envelope.Tipo);
            req.Headers.TryAddWithoutValidation("X-Atos-Delivery", envelope.Id.ToString());
            req.Headers.TryAddWithoutValidation("X-Atos-Timestamp", envelope.OcorridoEm.ToString("O"));
            if (assinatura is not null)
                req.Headers.TryAddWithoutValidation("X-Atos-Signature", assinatura);

            using var resp = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
            var status = (int)resp.StatusCode;

            if (resp.IsSuccessStatusCode)
                return (true, $"HTTP {status}", false);

            // 4xx (exceto 408/429) é erro do lado do destino/configuração: não adianta repetir.
            var repetir = status >= 500 || resp.StatusCode is HttpStatusCode.RequestTimeout or HttpStatusCode.TooManyRequests;
            return (false, $"HTTP {status} {resp.ReasonPhrase}", repetir);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            return (false, "cancelado (encerramento)", false);
        }
        catch (OperationCanceledException)
        {
            return (false, "timeout", true);
        }
        catch (HttpRequestException ex)
        {
            return (false, $"erro de rede: {ex.Message}", true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro inesperado ao entregar webhook {Destino} {DeliveryId}", destino.Nome, envelope.Id);
            return (false, $"erro inesperado: {ex.GetType().Name}", false);
        }
    }

    public override void Dispose()
    {
        _semaforo.Dispose();
        base.Dispose();
    }

    /// <summary>HMAC-SHA256 do corpo bruto com o segredo, em hexadecimal minúsculo.</summary>
    public static string Assinar(string segredo, byte[] corpo) =>
        Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(segredo), corpo));
}
