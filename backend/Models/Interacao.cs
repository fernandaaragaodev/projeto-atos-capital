using backend.Enums;

namespace backend.Models;

public class Interacao : BaseEntity
{
    public int ChamadoId { get; set; }
    public int AutorId { get; set; }
    public TipoInteracaoEnum Tipo { get; set; }
    public string Mensagem { get; set; } = string.Empty;
    public string? Anexos { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    // Propriedades de Navegação
    public virtual Chamado Chamado { get; set; } = null!;
    public virtual Usuario Autor { get; set; } = null!;

    public bool EhVisivelAoCliente() => Tipo == TipoInteracaoEnum.PUBLICA;
}
