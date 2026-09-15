using backend.Enums;

namespace backend.Models;


public class Usuario : BaseEntity
{
    public string IdExterno { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string SenhaHash { get; set; } = string.Empty;
    public int GrupoEmpresaId { get; set; }
    public PapelEnum Papel { get; set; }

    // Propriedades de Navegação
    public virtual GrupoEmpresa GrupoEmpresa { get; set; } = null!;
    public virtual ICollection<Chamado> ChamadosCriados { get; set; } = new List<Chamado>();
    public virtual ICollection<Chamado> ChamadosAtendidos { get; set; } = new List<Chamado>();
    public virtual ICollection<Interacao> Interacoes { get; set; } = new List<Interacao>();
    public virtual ICollection<LogAuditoria> LogsAuditoria { get; set; } = new List<LogAuditoria>();

    public bool TemPermissao(string acao)
    {
        if (Papel == PapelEnum.ADMIN) return true;
        if (Papel == PapelEnum.SUPERVISOR && acao != "excluir_sistema") return true;
        if (Papel == PapelEnum.AGENTE && (acao == "atender" || acao == "interagir")) return true;
        if (Papel == PapelEnum.CLIENTE && (acao == "abrir" || acao == "responder")) return true;
        return false;
    }
}
