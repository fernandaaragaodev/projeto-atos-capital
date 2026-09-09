using backend.Data;
using backend.Enums;
using backend.Events;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Services;

/// <summary>
/// RF07/RF09 — Monitoramento de SLA e alertas de estouro.
/// BackgroundService que, a cada <see cref="SlaOptions.IntervaloSegundos"/>, verifica chamados abertos e dispara
/// (uma única vez por chamado e por tipo) alertas de:
///  - RESPOSTA_ATRASADA: PrazoResposta vencido sem nenhuma interação de AGENTE/SUPERVISOR/ADMIN;
///  - RISCO_RESOLUCAO:   PrazoResolucao dentro da janela de risco (default 2h);
///  - ESTOURO_RESOLUCAO: PrazoResolucao vencido.
/// Cada alerta grava AlertaSla (histórico), LogAuditoria e publica evento via IEventoService.
/// Nunca derruba o host: toda exceção dentro do loop é capturada e logada.
/// </summary>
public sealed class SlaMonitorService : BackgroundService
{
    public const string AcaoAlertaRisco = "ALERTA_SLA_RISCO";
    public const string AcaoAlertaEstouro = "ALERTA_SLA_ESTOURO";
    public const string AcaoAlertaRespostaAtrasada = "ALERTA_RESPOSTA_ATRASADA";

    /// <summary>E-mail do admin criado no seed do Program.cs; é o "usuário sistema" da auditoria dos alertas.</summary>
    public const string EmailAdminSistema = "admin@atos.com";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<SlaOptions> _options;
    private readonly ILogger<SlaMonitorService> _logger;

    // Estatísticas simples de operação (expostas para diagnóstico via endpoint)
    public DateTime? UltimaExecucaoEm { get; private set; }
    public int TotalCiclos { get; private set; }
    public int TotalAlertasDisparados { get; private set; }
    public string? UltimoErro { get; private set; }

    public SlaMonitorService(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<SlaOptions> options,
        ILogger<SlaMonitorService> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var atrasoInicial = Math.Max(0, _options.CurrentValue.AtrasoInicialSegundos);
        _logger.LogInformation("SlaMonitorService iniciado. Primeira verificação em {Atraso}s, intervalo de {Intervalo}s.",
            atrasoInicial, IntervaloAtual());

        try
        {
            if (atrasoInicial > 0)
                await Task.Delay(TimeSpan.FromSeconds(atrasoInicial), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ExecutarCicloAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    // Nunca derrubar o host: registra e tenta de novo no próximo ciclo
                    UltimoErro = $"{DateTime.UtcNow:O} - {ex.GetType().Name}: {ex.Message}";
                    _logger.LogError(ex, "Erro no ciclo do monitor de SLA; será tentado novamente no próximo intervalo.");
                }

                // Intervalo relido a cada ciclo para respeitar alterações em runtime do appsettings
                await Task.Delay(TimeSpan.FromSeconds(IntervaloAtual()), stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Encerramento normal do host
        }

        _logger.LogInformation("SlaMonitorService encerrado.");
    }

    private int IntervaloAtual() => Math.Max(5, _options.CurrentValue.IntervaloSegundos);

    /// <summary>
    /// Executa uma verificação completa (abre o próprio scope). Público para permitir disparo manual
    /// (POST /api/Relatorios/alertas-sla/verificar) e testes.
    /// </summary>
    /// <returns>Quantidade de alertas disparados neste ciclo.</returns>
    public async Task<int> ExecutarCicloAsync(CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var eventos = scope.ServiceProvider.GetRequiredService<IEventoService>();

        var agora = DateTime.UtcNow;
        var limiteRisco = agora.AddHours(Math.Max(0, _options.CurrentValue.JanelaRiscoHoras));

        // Candidatos: chamados não finalizados com algum prazo que exija alerta ainda não disparado.
        // A existência de resposta de agente é calculada no banco (subquery), sem carregar interações.
        var candidatos = await db.Chamados
            .Where(c => c.Status != StatusEnum.RESOLVIDO && c.Status != StatusEnum.FECHADO)
            .Where(c =>
                (c.PrazoResposta != null && c.PrazoResposta < agora && c.AlertaRespostaAtrasadaEm == null) ||
                (c.PrazoResolucao != null && c.PrazoResolucao < agora && c.AlertaEstouroSlaEm == null) ||
                (c.PrazoResolucao != null && c.PrazoResolucao >= agora && c.PrazoResolucao <= limiteRisco && c.AlertaRiscoSlaEm == null))
            .Select(c => new
            {
                Chamado = c,
                TemRespostaDeAgente = c.Interacoes.Any(i =>
                    i.Autor.Papel == PapelEnum.AGENTE ||
                    i.Autor.Papel == PapelEnum.SUPERVISOR ||
                    i.Autor.Papel == PapelEnum.ADMIN)
            })
            .ToListAsync(ct);

        TotalCiclos++;
        UltimaExecucaoEm = agora;

        if (candidatos.Count == 0)
        {
            _logger.LogDebug("Monitor de SLA: nenhum chamado exige alerta.");
            return 0;
        }

        var usuarioSistemaId = await ObterUsuarioSistemaIdAsync(db, ct);
        var disparados = 0;

        foreach (var item in candidatos)
        {
            ct.ThrowIfCancellationRequested();
            var chamado = item.Chamado;
            var pendentes = new List<(string tipoEvento, SlaEventoPayload payload)>();

            try
            {
                // (1) Resposta em atraso
                if (chamado.PrazoResposta.HasValue && chamado.PrazoResposta < agora
                    && chamado.AlertaRespostaAtrasadaEm == null && !item.TemRespostaDeAgente)
                {
                    chamado.AlertaRespostaAtrasadaEm = agora;
                    var minutosAtraso = (int)Math.Round((agora - chamado.PrazoResposta.Value).TotalMinutes);
                    RegistrarAlerta(db, chamado, TipoAlertaSlaEnum.RESPOSTA_ATRASADA, AcaoAlertaRespostaAtrasada,
                        "PrazoResposta", chamado.PrazoResposta.Value, usuarioSistemaId ?? chamado.AgenteId ?? chamado.UsuarioId, agora);
                    pendentes.Add((TiposEvento.SlaEstourado,
                        SlaEventoPayload.De(chamado, TipoAlertaSlaEnum.RESPOSTA_ATRASADA, minutosRestantes: null, minutosAtraso: minutosAtraso)));
                }

                // (3) Estouro do prazo de resolução (avaliado antes do risco: se já estourou, não é "risco")
                if (chamado.PrazoResolucao.HasValue && chamado.PrazoResolucao < agora && chamado.AlertaEstouroSlaEm == null)
                {
                    chamado.AlertaEstouroSlaEm = agora;
                    var minutosAtraso = (int)Math.Round((agora - chamado.PrazoResolucao.Value).TotalMinutes);
                    RegistrarAlerta(db, chamado, TipoAlertaSlaEnum.ESTOURO_RESOLUCAO, AcaoAlertaEstouro,
                        "PrazoResolucao", chamado.PrazoResolucao.Value, usuarioSistemaId ?? chamado.AgenteId ?? chamado.UsuarioId, agora);
                    pendentes.Add((TiposEvento.SlaEstourado,
                        SlaEventoPayload.De(chamado, TipoAlertaSlaEnum.ESTOURO_RESOLUCAO, minutosRestantes: null, minutosAtraso: minutosAtraso)));
                }
                // (2) Em risco: prazo de resolução dentro da janela (mesma regra de Chamado.EstaProximoDeEstourarSLA)
                else if (chamado.PrazoResolucao.HasValue && chamado.PrazoResolucao >= agora
                         && chamado.PrazoResolucao <= limiteRisco && chamado.AlertaRiscoSlaEm == null)
                {
                    chamado.AlertaRiscoSlaEm = agora;
                    var minutosRestantes = (int)Math.Round((chamado.PrazoResolucao.Value - agora).TotalMinutes);
                    RegistrarAlerta(db, chamado, TipoAlertaSlaEnum.RISCO_RESOLUCAO, AcaoAlertaRisco,
                        "PrazoResolucao", chamado.PrazoResolucao.Value, usuarioSistemaId ?? chamado.AgenteId ?? chamado.UsuarioId, agora);
                    pendentes.Add((TiposEvento.SlaEmRisco,
                        SlaEventoPayload.De(chamado, TipoAlertaSlaEnum.RISCO_RESOLUCAO, minutosRestantes: minutosRestantes, minutosAtraso: null)));
                }

                if (pendentes.Count == 0) continue;

                // Persiste marcadores + histórico + auditoria antes de publicar (evento só sai se o banco confirmou)
                await db.SaveChangesAsync(ct);
                disparados += pendentes.Count;

                foreach (var (tipoEvento, payload) in pendentes)
                {
                    try
                    {
                        await eventos.PublicarAsync(tipoEvento, chamado.Id, payload, ct);
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        _logger.LogWarning(ex, "Falha ao publicar evento {Tipo} do chamado {Codigo}.", tipoEvento, chamado.CodigoPublico);
                    }

                    _logger.LogWarning("Alerta de SLA {Tipo} disparado para o chamado {Codigo} (prioridade {Prioridade}).",
                        payload.TipoAlerta, chamado.CodigoPublico, payload.Prioridade);
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                // Isola a falha de um chamado para não impedir os demais
                _logger.LogError(ex, "Erro ao processar alertas do chamado {Id} ({Codigo}).", chamado.Id, chamado.CodigoPublico);
                db.ChangeTracker.Clear();
            }
        }

        TotalAlertasDisparados += disparados;
        if (disparados > 0)
            _logger.LogInformation("Monitor de SLA: {Qtd} alerta(s) disparado(s) neste ciclo.", disparados);

        return disparados;
    }

    private static void RegistrarAlerta(AppDbContext db, Chamado chamado, TipoAlertaSlaEnum tipo, string acao,
        string campo, DateTime prazo, int usuarioId, DateTime agora)
    {
        db.AlertasSla.Add(new AlertaSla
        {
            ChamadoId = chamado.Id,
            Tipo = tipo,
            CriadoEm = agora
        });

        db.LogsAuditoria.Add(new LogAuditoria
        {
            ChamadoId = chamado.Id,
            UsuarioId = usuarioId,
            Acao = acao,
            CampoAlterado = campo,
            ValorAnterior = prazo.ToString("O"),
            ValorNovo = agora.ToString("O"),
            Data = agora
        });
    }

    /// <summary>
    /// Autor dos LogAuditoria gerados pelo monitor: o admin do seed (admin@atos.com); se não existir, o primeiro ADMIN.
    /// Se não houver nenhum ADMIN, o chamador usa o agente do chamado e, em último caso, o solicitante.
    /// </summary>
    private static async Task<int?> ObterUsuarioSistemaIdAsync(AppDbContext db, CancellationToken ct)
    {
        var id = await db.Usuarios
            .Where(u => u.Papel == PapelEnum.ADMIN)
            .OrderBy(u => u.Email == EmailAdminSistema ? 0 : 1)
            .ThenBy(u => u.Id)
            .Select(u => (int?)u.Id)
            .FirstOrDefaultAsync(ct);
        return id;
    }
}

/// <summary>
/// Payload publicado nos eventos sla.em_risco / sla.estourado. Não contém dados sensíveis.
/// </summary>
public sealed record SlaEventoPayload(
    int ChamadoId,
    string CodigoPublico,
    int GrupoEmpresaId,
    int? AgenteId,
    string Prioridade,
    string Status,
    string TipoAlerta,
    DateTime? PrazoResposta,
    DateTime? PrazoResolucao,
    int? MinutosRestantes,
    int? MinutosAtraso)
{
    public static SlaEventoPayload De(Chamado c, TipoAlertaSlaEnum tipo, int? minutosRestantes, int? minutosAtraso) =>
        new(c.Id, c.CodigoPublico, c.GrupoEmpresaId, c.AgenteId, c.Prioridade.ToString(), c.Status.ToString(),
            tipo.ToString(), c.PrazoResposta, c.PrazoResolucao, minutosRestantes, minutosAtraso);
}
