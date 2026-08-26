namespace backend.Models;

public enum StatusChamado
{
    Aberto,
    EmAndamento,
    AguardandoCliente,
    Resolvido,
    Fechado
}

public class Chamado
{
    public int Id { get; set; }
    public string CodigoPublico { get; set; } = string.Empty;
    public int UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }
    public int GrupoEmpresaId { get; set; }
    public GrupoEmpresa? GrupoEmpresa { get; set; }
    public int? AgenteId { get; set; }
    public Usuario? Agente { get; set; }
    public string Produto { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public StatusChamado Status { get; set; } = StatusChamado.Aberto;
    public PrioridadeChamado Prioridade { get; set; } = PrioridadeChamado.Media;
    public DateTime SlaPrazo { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public DateTime? FechadoEm { get; set; }
}