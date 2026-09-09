using System.Text.Json;

namespace backend.Events;

/// <summary>
/// Envelope que trafega no canal e é enviado (serializado em camelCase) para cada webhook.
/// O payload já vem serializado em JsonElement no momento da publicação, para não depender
/// de entidades EF/escopo de requisição depois que a requisição terminou.
/// </summary>
public sealed record EventoEnvelope(
    Guid Id,
    string Tipo,
    int? ChamadoId,
    DateTime OcorridoEm,
    JsonElement Payload
);
