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

    // Marcadores de alerta de SLA (RF07/RF09) — preenchidos pelo SlaMonitorService para não alertar repetidamente
    public DateTime? AlertaRiscoSlaEm { get; set; }
    public DateTime? AlertaEstouroSlaEm { get; set; }
    public DateTime? AlertaRespostaAtrasadaEm { get; set; }

    // Propriedades de Navegação
    public virtual Usuario Usuario { get; set; } = null!;
    public virtual GrupoEmpresa GrupoEmpresa { get; set; } = null!;
    public virtual Usuario? Agente { get; set; }
    public virtual SLACategoria? SlaCategoria { get; set; }
    public virtual ICollection<Interacao> Interacoes { get; set; } = new List<Interacao>();
    public virtual ICollection<LogAuditoria> LogsAuditoria { get; set; } = new List<LogAuditoria>();
    public virtual ICollection<AlertaSla> AlertasSla { get; set; } = new List<AlertaSla>();

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
        var agora = DateTime.UtcNow;

        // Ao sair de AGUARDANDO_CLIENTE o marcador de espera deixa de valer
        if (Status == StatusEnum.AGUARDANDO_CLIENTE && novoStatus != StatusEnum.AGUARDANDO_CLIENTE)
        {
            AguardandoDesde = null;
        }

        if (novoStatus == StatusEnum.AGUARDANDO_CLIENTE)
        {
            AguardandoDesde = agora;
        }
        else if (novoStatus == StatusEnum.RESOLVIDO)
        {
            ResolvidoEm = agora;
        }
        else if (novoStatus == StatusEnum.FECHADO)
        {
            FechadoEm = agora;
        }
        else if (novoStatus == StatusEnum.EM_ANDAMENTO && Status == StatusEnum.RESOLVIDO)
        {
            // Reabertura: o chamado volta a contar como ativo (o agente volta a ficar "ocupado")
            ResolvidoEm = null;
        }

        Status = novoStatus;
    }

    /// <summary>
    /// Máquina de estados do chamado (RF04). FECHADO é terminal.
    /// </summary>
    public static bool TransicaoPermitida(StatusEnum de, StatusEnum para) => (de, para) switch
    {
        (StatusEnum.ABERTO, StatusEnum.EM_ANDAMENTO) => true,
        (StatusEnum.ABERTO, StatusEnum.AGUARDANDO_CLIENTE) => true,
        (StatusEnum.ABERTO, StatusEnum.RESOLVIDO) => true,
        (StatusEnum.EM_ANDAMENTO, StatusEnum.AGUARDANDO_CLIENTE) => true,
        (StatusEnum.EM_ANDAMENTO, StatusEnum.RESOLVIDO) => true,
        (StatusEnum.AGUARDANDO_CLIENTE, StatusEnum.EM_ANDAMENTO) => true,
        (StatusEnum.AGUARDANDO_CLIENTE, StatusEnum.RESOLVIDO) => true,
        (StatusEnum.RESOLVIDO, StatusEnum.FECHADO) => true,
        (StatusEnum.RESOLVIDO, StatusEnum.EM_ANDAMENTO) => true, // reabrir
        _ => false
    };

    public bool PodeTransicionarPara(StatusEnum novoStatus) => TransicaoPermitida(Status, novoStatus);

    public static bool EhStatusFinal(StatusEnum status) => status == StatusEnum.RESOLVIDO || status == StatusEnum.FECHADO;

    public void AlterarPrioridade(PrioridadeEnum novaPrioridade)
    {
        Prioridade = novaPrioridade;
    }

    public bool EstaProximoDeEstourarSLA() => CalcularSlaEmRisco(Status, PrazoResolucao, DateTime.UtcNow);

    /// <summary>SLA de resolução já estourado: prazo no passado e chamado ainda não resolvido/fechado.</summary>
    public bool SlaEstourado() => CalcularSlaEstourado(Status, PrazoResolucao, DateTime.UtcNow);

    /// <summary>Versão estática (sem instância) para uso em projeções/DTOs. Mesma regra de EstaProximoDeEstourarSLA.</summary>
    public static bool CalcularSlaEmRisco(StatusEnum status, DateTime? prazoResolucao, DateTime agora)
    {
        if (!prazoResolucao.HasValue || EhStatusFinal(status))
            return false;

        var tempoRestante = prazoResolucao.Value - agora;
        return tempoRestante.TotalHours <= 2 && tempoRestante.TotalHours > 0;
    }

    /// <summary>Versão estática (sem instância) para uso em projeções/DTOs. Mesma regra de SlaEstourado.</summary>
    public static bool CalcularSlaEstourado(StatusEnum status, DateTime? prazoResolucao, DateTime agora)
    {
        if (!prazoResolucao.HasValue || EhStatusFinal(status))
            return false;

        return prazoResolucao.Value < agora;
    }

    public void Resolver() => AlterarStatus(StatusEnum.RESOLVIDO);
    public void Fechar() => AlterarStatus(StatusEnum.FECHADO);
}