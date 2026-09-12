using backend.Enums;

namespace backend.DTOs;

public record LoginDto(
    string Email
);

public record TokenResponseDto(
    string Token,
    string Nome,
    string Email,
    PapelEnum Papel,
    int GrupoEmpresaId
);

/// <summary>Retorno de GET /api/Auth/me. Nunca inclui SenhaHash.</summary>
public record UsuarioMeDto(
    int Id,
    string Nome,
    string Email,
    PapelEnum Papel,
    int GrupoEmpresaId,
    string GrupoEmpresaNome
);