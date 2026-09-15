namespace backend.Models;

public class LogAuditoria : BaseEntity
{
    public int ChamadoId { get; set; }
    public int UsuarioId { get; set; }
    public string Acao { get; set; } = string.Empty;
    public string CampoAlterado { get; set; } = string.Empty;
    public string ValorAnterior { get; set; } = string.Empty;
    public string ValorNovo { get; set; } = string.Empty;
    public DateTime Data { get; set; } = DateTime.UtcNow;

    // Propriedades de Navegação
    public virtual Chamado Chamado { get; set; } = null!;
    public virtual Usuario Usuario { get; set; } = null!;
}
