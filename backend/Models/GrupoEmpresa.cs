using backend.Enums;

namespace backend.Models;

public class GrupoEmpresa
{
    public int Id { get; set; }
    public string IdExterno { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public TipoGrupoEnum Tipo { get; set; }
    public int? MatrizId { get; set; }

    // Propriedades de Navegação
    public virtual GrupoEmpresa? Matriz { get; set; }
    public virtual ICollection<GrupoEmpresa> Filiais { get; set; } = new List<GrupoEmpresa>();
    public virtual ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
    public virtual ICollection<Chamado> Chamados { get; set; } = new List<Chamado>();
}