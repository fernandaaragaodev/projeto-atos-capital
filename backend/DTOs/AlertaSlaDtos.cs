using backend.Enums;

namespace backend.DTOs;

public record AlertaSlaDto(
    int Id,
    int ChamadoId,
    string CodigoPublico,
    TipoAlertaSlaEnum Tipo,
    string TipoNome,
    DateTime CriadoEm,
    DateTime? ReconhecidoEm,
    int? ReconhecidoPorId,
    string? ReconhecidoPorNome,
    StatusEnum StatusChamado,
    PrioridadeEnum Prioridade,
    string Produto,
    string Categoria,
    int GrupoEmpresaId,
    int? AgenteId,
    string? AgenteNome,
    DateTime? PrazoResposta,
    DateTime? PrazoResolucao);

public record StatusMonitorSlaDto(
    DateTime? UltimaExecucaoEm,
    int TotalCiclos,
    int TotalAlertasDisparados,
    string? UltimoErro,
    int AlertasDisparadosAgora);
