using backend.Enums;

namespace backend.Models;

/// <summary>
/// Histórico de alertas de SLA disparados pelo SlaMonitorService (RF07/RF09).
/// Cada chamado recebe no máximo um alerta de cada tipo (controlado pelas colunas Alerta*Em do Chamado).
/// </summary>
public class AlertaSla
{
    public int Id { get; set; }
    public int ChamadoId { get; set; }
    public TipoAlertaSlaEnum Tipo { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public DateTime? ReconhecidoEm { get; set; }
    public int? ReconhecidoPorId { get; set; }

    // Propriedades de Navegação
    public virtual Chamado Chamado { get; set; } = null!;
    public virtual Usuario? ReconhecidoPor { get; set; }

    public bool EstaPendente() => ReconhecidoEm == null;

    public void Reconhecer(int usuarioId)
    {
        ReconhecidoEm = DateTime.UtcNow;
        ReconhecidoPorId = usuarioId;
    }
}
