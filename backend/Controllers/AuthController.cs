using backend.Data;
using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly AuthService _authService;

    public AuthController(AppDbContext context, AuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<TokenResponseDto>> Login([FromBody] LoginDto dto)
    {
        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Email == dto.Email && u.SenhaHash == dto.Senha);

        if (usuario == null)
        {
            return Unauthorized("E-mail ou senha inválidos.");
        }

        var token = _authService.GerarToken(usuario);

        return Ok(new TokenResponseDto(
            token,
            usuario.Nome,
            usuario.Email,
            usuario.Papel,
            usuario.GrupoEmpresaId
        ));
    }
}