using backend.Enums;

namespace backend.DTOs;

/// <summary>
/// Filtros comuns dos relatórios gerenciais (RF08), lidos da query string.
/// Datas sem fuso são tratadas como UTC; DataFim sem hora é inclusiva (vai até 23:59:59 daquele dia).
/// </summary>
public class FiltroRelatorioDto
{
    public DateTime? DataInicio { get; set; }
    public DateTime? DataFim { get; set; }
    public int? GrupoEmpresaId { get; set; }
    public int? AgenteId { get; set; }
    public string? Produto { get; set; }
}

public record TotalPorStatusDto(StatusEnum Status, string Nome, int Total);

public record TotalPorPrioridadeDto(PrioridadeEnum Prioridade, string Nome, int Total);

public record TotalPorProdutoDto(string Produto, int Total, int Abertos, int EmAndamento, int AguardandoCliente, int Resolvidos, int Fechados);

public record TotalPorGrupoEmpresaDto(int GrupoEmpresaId, string GrupoEmpresa, int Total, int EmAberto, int Finalizados);

public record TotalPorCategoriaDto(string Categoria, int Total, int EmAberto, int Finalizados);

public record ResumoRelatorioDto(
    int TotalChamados,
    IReadOnlyList<TotalPorStatusDto> TotaisPorStatus,
    int AbertosHoje,
    int ResolvidosNoPeriodo,
    int EmAbertoNoMomento,
    double? TempoMedioPrimeiraRespostaHoras,
    double? TempoMedioResolucaoHoras,
    int ChamadosComSlaResolucaoAvaliados,
    double? PercentualDentroSlaResolucao,
    int ChamadosComSlaRespostaAvaliados,
    double? PercentualDentroSlaResposta);

public record RelatorioPorAgenteDto(
    int AgenteId,
    string AgenteNome,
    int ChamadosAtribuidos,
    int Resolvidos,
    int AbertosNoMomento,
    double? TempoMedioResolucaoHoras,
    int ChamadosComSlaAvaliados,
    double? PercentualSlaCumprido);

public record PontoEvolucaoDto(DateTime Periodo, string Rotulo, int Abertos, int Resolvidos);

public record EvolucaoRelatorioDto(string Granularidade, DateTime Inicio, DateTime Fim, IReadOnlyList<PontoEvolucaoDto> Serie);

public record SlaPorDimensaoDto(
    string Chave,
    int TotalChamados,
    int ComSla,
    int ResolucaoCumprida,
    int ResolucaoViolada,
    int ResolucaoPendente,
    double? PercentualResolucaoCumprida,
    int RespostaCumprida,
    int RespostaViolada,
    int RespostaPendente,
    double? PercentualRespostaCumprida);

public record RelatorioSlaDto(
    IReadOnlyList<SlaPorDimensaoDto> PorProduto,
    IReadOnlyList<SlaPorDimensaoDto> PorCategoria,
    IReadOnlyList<SlaPorDimensaoDto> PorPrioridade);

public record ChamadoEmRiscoSlaDto(
    int Id,
    string CodigoPublico,
    string Produto,
    string Categoria,
    StatusEnum Status,
    PrioridadeEnum Prioridade,
    int GrupoEmpresaId,
    string GrupoEmpresa,
    int? AgenteId,
    string? AgenteNome,
    DateTime CriadoEm,
    DateTime? PrazoResposta,
    DateTime? PrazoResolucao,
    int MinutosParaPrazoResolucao,
    string Situacao,
    DateTime? AlertaRiscoSlaEm,
    DateTime? AlertaEstouroSlaEm,
    DateTime? AlertaRespostaAtrasadaEm);
