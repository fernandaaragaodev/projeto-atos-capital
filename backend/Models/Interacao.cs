namespace backend.Models;

public enum TipoInteracao
{
    Publica,
    NotaInterna
}

public class Interacao
{
    public int Id { get; set; }
    public int ChamadoId { get; set; }
    public Chamado? Chamado { get; set; }
    public int AutorId { get; set; }
    public Usuario? Autor { get; set; }
    public TipoInteracao Tipo { get; set; } = TipoInteracao.Publica;
    public string Mensagem { get; set; } = string.Empty;
    public string? Anexos { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}