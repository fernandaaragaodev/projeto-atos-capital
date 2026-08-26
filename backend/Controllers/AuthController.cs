using backend.Data;
using backend.DTOs;
using backend.Models;
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
    public async Task<ActionResult<TokenResponseDto>> Login([FromBody] LoginDto login)
    {
        // Busca o usuário comparando o e-mail (insensível a maiúsculas/minúsculas) e a senha
        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Email.ToLower() == login.Email.ToLower() && u.Senha == login.Senha);

        if (usuario == null)
            return Unauthorized("Usuário ou senha inválidos.");

        // Gera o token JWT com as Claims do usuário e o seu Papel (Role)
        var token = _authService.GerarTokenJwt(usuario);

        return Ok(new TokenResponseDto(token, usuario.Nome, usuario.Email, usuario.Papel));
    }
}