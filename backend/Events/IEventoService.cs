namespace backend.Events;

/// <summary>
/// Contrato compartilhado de eventos de domínio.
/// Qualquer parte da API que gere um evento relevante (status alterado, SLA estourado, interação criada etc.)
/// deve chamar PublicarAsync. A implementação (EventoService) faz fan-out para os webhooks configurados.
/// Nomes de evento são constantes em <see cref="TiposEvento"/>.
/// </summary>
public interface IEventoService
{
    /// <param name="tipo">Um dos valores de <see cref="TiposEvento"/>.</param>
    /// <param name="chamadoId">Id interno do chamado relacionado (ou null se não houver).</param>
    /// <param name="payload">Objeto serializável com os dados do evento (nunca incluir SenhaHash/JWT).</param>
    Task PublicarAsync(string tipo, int? chamadoId, object payload, CancellationToken ct = default);
}

public static class TiposEvento
{
    public const string ChamadoCriado          = "chamado.criado";
    public const string ChamadoStatusAlterado  = "chamado.status_alterado";
    public const string ChamadoAgenteAtribuido = "chamado.agente_atribuido";
    public const string ChamadoResolvido       = "chamado.resolvido";
    public const string ChamadoFechado         = "chamado.fechado";
    public const string InteracaoCriada        = "interacao.criada";
    public const string AnexoAdicionado        = "anexo.adicionado";
    public const string SlaEmRisco             = "sla.em_risco";
    public const string SlaEstourado           = "sla.estourado";
}
