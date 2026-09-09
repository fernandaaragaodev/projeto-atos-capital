using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Channels;

namespace backend.Events;

/// <summary>
/// Implementação real de <see cref="IEventoService"/>: monta o envelope e enfileira em um
/// Channel singleton. O <see cref="WebhookDispatcher"/> consome o canal em background.
/// Nunca lança para o chamador por falha de webhook — a entrega é assíncrona e isolada.
/// </summary>
public sealed class EventoService : IEventoService
{
    internal static readonly JsonSerializerOptions JsonOpcoes = new(JsonSerializerDefaults.Web)
    {
        ReferenceHandler = ReferenceHandler.IgnoreCycles,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly ChannelWriter<EventoEnvelope> _writer;
    private readonly ILogger<EventoService> _logger;

    public EventoService(Channel<EventoEnvelope> canal, ILogger<EventoService> logger)
    {
        _writer = canal.Writer;
        _logger = logger;
    }

    public async Task PublicarAsync(string tipo, int? chamadoId, object payload, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(tipo))
            throw new ArgumentException("O tipo do evento é obrigatório.", nameof(tipo));

        JsonElement payloadJson;
        try
        {
            payloadJson = JsonSerializer.SerializeToElement(payload ?? new { }, JsonOpcoes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falha ao serializar payload do evento {Tipo} (chamado {ChamadoId}); enviando payload vazio", tipo, chamadoId);
            payloadJson = JsonSerializer.SerializeToElement(new { erroSerializacao = ex.GetType().Name }, JsonOpcoes);
        }

        var envelope = new EventoEnvelope(Guid.NewGuid(), tipo, chamadoId, DateTime.UtcNow, payloadJson);

        try
        {
            await _writer.WriteAsync(envelope, ct);
            _logger.LogDebug("Evento {Tipo} {DeliveryId} (chamado {ChamadoId}) enfileirado", tipo, envelope.Id, chamadoId);
        }
        catch (ChannelClosedException ex)
        {
            // Aplicação encerrando: não derruba a requisição por causa do webhook.
            _logger.LogWarning(ex, "Canal de eventos fechado; evento {Tipo} {DeliveryId} descartado", tipo, envelope.Id);
        }
    }
}
