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