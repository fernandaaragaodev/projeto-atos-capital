namespace backend.Events;

/// <summary>
/// Configuração da seção "Webhooks" do appsettings.
/// </summary>
public sealed class WebhooksOptions
{
    public const string Secao = "Webhooks";

    /// <summary>Desliga o dispatcher (eventos continuam sendo enfileirados e descartados com log).</summary>
    public bool Habilitado { get; set; } = true;

    /// <summary>Timeout de cada POST ao destino, em segundos.</summary>
    public int TimeoutSegundos { get; set; } = 10;

    /// <summary>
    /// Esperas (em segundos) antes de cada nova tentativa após uma falha. 3 valores = 3 retentativas.
    /// Sem default no inicializador de propósito: o binder de configuração CONCATENA defaults de coleção com o appsettings.
    /// Se omitido/vazio, usa <see cref="RetryDelaysPadrao"/> (1s, 4s, 16s).
    /// </summary>
    public int[]? RetryDelaysSegundos { get; set; }

    public static readonly int[] RetryDelaysPadrao = [1, 4, 16];

    public int[] RetryDelaysEfetivos => RetryDelaysSegundos is { Length: > 0 } ? RetryDelaysSegundos : RetryDelaysPadrao;

    /// <summary>Capacidade do canal em memória. Se cheio, PublicarAsync aguarda (backpressure).</summary>
    public int CapacidadeFila { get; set; } = 10_000;

    /// <summary>Quantas entregas HTTP podem estar em andamento ao mesmo tempo.</summary>
    public int MaxEntregasSimultaneas { get; set; } = 8;

    public List<WebhookDestino> Destinos { get; set; } = new();
}

public sealed class WebhookDestino
{
    public string Nome { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;

    /// <summary>Segredo compartilhado para a assinatura HMAC-SHA256 (header X-Atos-Signature). Opcional.</summary>
    public string? Segredo { get; set; }

    /// <summary>Lista de tipos de evento aceitos, ou ["*"] para todos. Omitida/vazia = todos (sem default no inicializador: ver RetryDelaysSegundos).</summary>
    public List<string>? Eventos { get; set; }

    public bool Ativo { get; set; } = true;

    public IReadOnlyList<string> EventosEfetivos => Eventos is { Count: > 0 } ? Eventos : ["*"];

    public bool AceitaEvento(string tipo) =>
        Ativo && EventosEfetivos.Any(e => e == "*" || string.Equals(e, tipo, StringComparison.OrdinalIgnoreCase));
}
