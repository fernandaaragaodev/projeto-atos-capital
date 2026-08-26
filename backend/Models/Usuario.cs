namespace backend.Models;

public enum PapelUsuario
{
    Cliente,
    Agente,
    Supervisor,
    Admin
}

public class Usuario
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int GrupoEmpresaId { get; set; }
    public GrupoEmpresa? GrupoEmpresa { get; set; }
    public PapelUsuario Papel { get; set; } = PapelUsuario.Cliente;
}