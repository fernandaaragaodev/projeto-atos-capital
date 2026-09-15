using backend.Enums;

namespace backend.DTOs;

// DTOs de detalhe do chamado (RF02). Somente dados necessários — nunca SenhaHash nem entidades cruas.

public record UsuarioChamadoDto(int Id, string Nome, string Email);

public record AgenteChamadoDto(int Id, string Nome);

public record GrupoEmpresaChamadoDto(int Id, string Nome);

public record SlaCategoriaChamadoDto(
    int Id,
    string Produto,
    string Categoria,
    PrioridadeEnum Prioridade,
    int TempoResposta,
    int TempoResolucao
);

public record AutorInteracaoDto(int Id, string Nome, PapelEnum Papel);

public record InteracaoChamadoDto(
    int Id,
    int ChamadoId,
    AutorInteracaoDto Autor,
    TipoInteracaoEnum Tipo,
    string Mensagem,
    string? Anexos,
    DateTime CriadoEm
);

public record LogAuditoriaChamadoDto(
    int Id,
    string Acao,
    string CampoAlterado,
    string ValorAnterior,
    string ValorNovo,
    string UsuarioNome,
    DateTime Data
);

public record ChamadoDetalheDto(
    int Id,
    string CodigoPublico,
    string Produto,
    string Categoria,
    string Descricao,
    StatusEnum Status,
    PrioridadeEnum Prioridade,
    DateTime? PrazoResposta,
    DateTime? PrazoResolucao,
    DateTime? AguardandoDesde,
    DateTime CriadoEm,
    DateTime? ResolvidoEm,
    DateTime? FechadoEm,
    UsuarioChamadoDto Usuario,
    AgenteChamadoDto? Agente,
    GrupoEmpresaChamadoDto GrupoEmpresa,
    SlaCategoriaChamadoDto? SlaCategoria,
    bool SlaEmRisco,
    bool SlaEstourado,
    IReadOnlyList<InteracaoChamadoDto> Interacoes,
    IReadOnlyList<LogAuditoriaChamadoDto> LogsAuditoria
);
