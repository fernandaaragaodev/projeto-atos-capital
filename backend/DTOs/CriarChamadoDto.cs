namespace backend.DTOs;

using backend.Enums;

public record CriarChamadoDto(
    string Produto,
    string Categoria,
    string Descricao,
    PrioridadeEnum Prioridade
);