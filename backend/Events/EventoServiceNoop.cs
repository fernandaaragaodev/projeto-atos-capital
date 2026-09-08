namespace backend.Events;

/// <summary>
/// Implementação temporária (no-op) para que o resto da API compile e injete IEventoService
/// enquanto o EventoService real (webhooks) não é entregue. Será substituída no Program.cs.
/// </summary>
public sealed class EventoServiceNoop : IEventoService
{
    private readonly ILogger<EventoServiceNoop> _logger;
    public EventoServiceNoop(ILogger<EventoServiceNoop> logger) => _logger = logger;

    public Task PublicarAsync(string tipo, int? chamadoId, object payload, CancellationToken ct = default)
    {
        _logger.LogDebug("Evento {Tipo} (chamado {ChamadoId}) publicado em no-op", tipo, chamadoId);
        return Task.CompletedTask;
    }
}
