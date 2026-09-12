using System.Security.Claims;
using backend.Data.Repositories;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IBaseRepository<Usuario> _usuarios;
    private readonly AuthService _authService;

    public AuthController(IBaseRepository<Usuario> usuarios, AuthService authService)
    {
        _usuarios = usuarios;
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<TokenResponseDto>> Login([FromBody] LoginDto dto)
    {
        var usuario = await _usuarios.ObterTodos()
            .FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (usuario == null)
        {
            return Unauthorized("E-mail inválido.");
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

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UsuarioMeDto>> Me()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(idClaim) || !int.TryParse(idClaim, out var id))
        {
            return Unauthorized();
        }

        var usuario = await _usuarios.ObterTodos()
            .Include(u => u.GrupoEmpresa)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (usuario == null)
        {
            return Unauthorized();
        }

        return Ok(new UsuarioMeDto(
            usuario.Id,
            usuario.Nome,
            usuario.Email,
            usuario.Papel,
            usuario.GrupoEmpresaId,
            usuario.GrupoEmpresa.Nome
        ));
    }
}
