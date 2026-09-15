using backend.Enums;

namespace backend.Models;

public class SLACategoria : BaseEntity
{
    public string Produto { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public PrioridadeEnum Prioridade { get; set; }
    public int TempoResposta { get; set; } // Em minutos ou horas
    public int TempoResolucao { get; set; } // Em minutos ou horas

    public virtual ICollection<Chamado> Chamados { get; set; } = new List<Chamado>();

    public DateTime CalcularPrazoResposta(DateTime criadoEm) => criadoEm.AddHours(TempoResposta);
    public DateTime CalcularPrazoResolucao(DateTime criadoEm) => criadoEm.AddHours(TempoResolucao);
    
    public bool FoiViolado(Chamado chamado)
    {
        var agora = DateTime.UtcNow;
        if (chamado.Status != StatusEnum.RESOLVIDO && chamado.Status != StatusEnum.FECHADO)
        {
            return agora > chamado.PrazoResolucao;
        }
        return chamado.ResolvidoEm > chamado.PrazoResolucao;
    }
}
