namespace backend.Enums;

/// <summary>
/// Tipos de alerta gerados pelo monitor de SLA (RF07/RF09).
/// </summary>
public enum TipoAlertaSlaEnum
{
    RESPOSTA_ATRASADA = 0,
    RISCO_RESOLUCAO = 1,
    ESTOURO_RESOLUCAO = 2
}
