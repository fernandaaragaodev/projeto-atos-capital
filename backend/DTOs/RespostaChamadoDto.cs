using backend.Enums;

namespace backend.DTOs;

public record RespostaChamadoDto(
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
    int UsuarioId,
    int GrupoEmpresaId,
    int? AgenteId,
    int? SlaCategoriaId,
    DateTime? AguardandoDesde,
    DateTime? ResolvidoEm,
    DateTime? FechadoEm
);
