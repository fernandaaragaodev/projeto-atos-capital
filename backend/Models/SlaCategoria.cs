namespace backend.Models;

public enum PrioridadeChamado
{
    Baixa,
    Media,
    Alta,
    Critica
}

public class SlaCategoria
{
    public int Id { get; set; }
    public string Produto { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public PrioridadeChamado Prioridade { get; set; }
    public int TempoRespostaMinutos { get; set; }
    public int TempoResolucaoMinutos { get; set; }
}