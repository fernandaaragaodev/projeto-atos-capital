using backend.Enums;

namespace backend.DTOs;

/// <summary>Prazos (em horas) de uma combinação Produto x Categoria x Prioridade.</summary>
public record SlaPrioridadeDto(
    PrioridadeEnum Prioridade,
    int TempoRespostaHoras,
    int TempoResolucaoHoras
);

/// <summary>Categoria válida para um produto, com os prazos de cada prioridade.</summary>
public record SlaCategoriaItemDto(
    string Categoria,
    IReadOnlyList<SlaPrioridadeDto> Prioridades
);

/// <summary>Produto cadastrado, com as categorias válidas para o formulário de novo chamado.</summary>
public record SlaProdutoDto(
    string Produto,
    IReadOnlyList<SlaCategoriaItemDto> Categorias
);
