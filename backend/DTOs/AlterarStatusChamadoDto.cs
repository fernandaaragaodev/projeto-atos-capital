using backend.Enums;

namespace backend.DTOs;

/// <summary>Corpo do PATCH /api/Chamados/{id}/status (RF04).</summary>
public record AlterarStatusChamadoDto(
    StatusEnum Status,
    string? Comentario
);
