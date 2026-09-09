using backend.Enums;

namespace backend.DTOs;

/// <summary>Item da listagem GET /api/Chamados (RF12). Nunca expõe a entidade Usuario (SenhaHash).</summary>
public record ChamadoResumoDto(
    int Id,
    string CodigoPublico,
    string Produto,
    string Categoria,
    string Descricao,
    StatusEnum Status,
    PrioridadeEnum Prioridade,
    DateTime? PrazoResposta,
    DateTime? PrazoResolucao,
    DateTime CriadoEm,
    DateTime? AguardandoDesde,
    DateTime? ResolvidoEm,
    DateTime? FechadoEm,
    int UsuarioId,
    string UsuarioNome,
    int GrupoEmpresaId,
    string GrupoEmpresaNome,
    int? AgenteId,
    string? AgenteNome,
    int QuantidadeInteracoes,
    bool SlaEmRisco,
    bool SlaEstourado
);

/// <summary>Envelope paginado da listagem de chamados.</summary>
public record PaginaChamadosDto(
    IReadOnlyList<ChamadoResumoDto> Itens,
    int Page,
    int PageSize,
    int Total,
    int TotalPaginas
);
