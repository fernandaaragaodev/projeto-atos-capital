using backend.Enums;

namespace backend.Models;

public class Chamado
{
    public int Id { get; set; }
    public string CodigoPublico { get; set; } = string.Empty;
    public int UsuarioId { get; set; }
    public int GrupoEmpresaId { get; set; }
    public int? AgenteId { get; set; }
    public int? SlaCategoriaId { get; set; }

    public string Produto { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public StatusEnum Status { get; set; } = StatusEnum.ABERTO;
    public PrioridadeEnum Prioridade { get; set; } = PrioridadeEnum.MEDIA;

    public DateTime? PrazoResposta { get; set; }
    public DateTime? PrazoResolucao { get; set; }
    public DateTime? AguardandoDesde { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvidoEm { get; set; }
    public DateTime? FechadoEm { get; set; }

    // Propriedades de Navegação
    public virtual Usuario Usuario { get; set; } = null!;
    public virtual GrupoEmpresa GrupoEmpresa { get; set; } = null!;
    public virtual Usuario? Agente { get; set; }
    public virtual SLACategoria? SlaCategoria { get; set; }
    public virtual ICollection<Interacao> Interacoes { get; set; } = new List<Interacao>();
    public virtual ICollection<LogAuditoria> LogsAuditoria { get; set; } = new List<LogAuditoria>();

    // Métodos do Diagrama
    public void GerarCodigoPublico()
    {
        CodigoPublico = $"ATOS-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}";
    }

    public void AtribuirAgente(int agenteId)
    {
        AgenteId = agenteId;
        Status = StatusEnum.EM_ANDAMENTO;
    }

    public void AlterarStatus(StatusEnum novoStatus)
    {
        if (novoStatus == StatusEnum.AGUARDANDO_CLIENTE)
        {
            AguardandoDesde = DateTime.UtcNow;
        }
        else if (novoStatus == StatusEnum.RESOLVIDO)
        {
            ResolvidoEm = DateTime.UtcNow;
        }
        else if (novoStatus == StatusEnum.FECHADO)
        {
            FechadoEm = DateTime.UtcNow;
        }

        Status = novoStatus;
    }

    public void AlterarPrioridade(PrioridadeEnum novaPrioridade)
    {
        Prioridade = novaPrioridade;
    }

    public bool EstaProximoDeEstourarSLA()
    {
        if (!PrazoResolucao.HasValue || Status == StatusEnum.RESOLVIDO || Status == StatusEnum.FECHADO)
            return false;

        var tempoRestante = PrazoResolucao.Value - DateTime.UtcNow;
        return tempoRestante.TotalHours <= 2 && tempoRestante.TotalHours > 0;
    }

    public void Resolver() => AlterarStatus(StatusEnum.RESOLVIDO);
    public void Fechar() => AlterarStatus(StatusEnum.FECHADO);
}