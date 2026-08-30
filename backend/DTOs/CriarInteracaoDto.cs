
using backend.Enums;

namespace backend.DTOs;

public record CriarInteracaoDto(
    string Mensagem,
    TipoInteracaoEnum Tipo,
    string? Anexos
);