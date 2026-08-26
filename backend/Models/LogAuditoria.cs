namespace backend.Models;

public class LogAuditoria
{
    public int Id { get; set; }
    public int ChamadoId { get; set; }
    public int UsuarioId { get; set; }
    public string Acao { get; set; } = string.Empty;
    public string? CampoAlterado { get; set; }
    public string? ValorAnterior { get; set; }
    public string? ValorNovo { get; set; }
    public DateTime Data { get; set; } = DateTime.UtcNow;
}