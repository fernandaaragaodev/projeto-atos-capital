using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.Data.Repositories;
using backend.Enums;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace backend.Services;

public class AuthService
{
    private readonly IConfiguration _config;

    public AuthService(IConfiguration config)
    {
        _config = config;
    }

    /// <summary>
    /// Valida a assinatura/emissor/validade de um token SSO emitido pelo portal Atos Capital.
    /// Retorna null se o token for inválido, expirado ou tiver assinatura incorreta.
    /// </summary>
    public ClaimsPrincipal? ValidarTokenSso(string token)
    {
        var chave = _config["Sso:Key"];
        if (string.IsNullOrWhiteSpace(chave)) return null;

        var handler = new JwtSecurityTokenHandler();
        try
        {
            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(chave)),
                ValidateIssuer = true,
                ValidIssuer = _config["Sso:Issuer"],
                ValidateAudience = true,
                ValidAudience = _config["Sso:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(2),
            }, out _);
            return principal;
        }
        catch (Exception ex) when (ex is SecurityTokenException or ArgumentException or FormatException)
        {
            // Cobre tanto falhas de validação (assinatura/emissor/expiração) quanto token mal formado.
            return null;
        }
    }

    /// <summary>
    /// Garante (upsert) o GrupoEmpresa e o Usuario correspondentes às claims do token SSO,
    /// sem precisar de sincronização em lote prévia com o portal.
    /// </summary>
    public async Task<Usuario> UpsertUsuarioSsoAsync(
        ClaimsPrincipal claims,
        IBaseRepository<GrupoEmpresa> grupos,
        IBaseRepository<Usuario> usuarios)
    {
        var grupoIdExterno = claims.FindFirstValue("grupoEmpresaIdExterno");
        var grupoNome = claims.FindFirstValue("grupoEmpresaNome");
        var usuarioIdExterno = claims.FindFirstValue(ClaimTypes.NameIdentifier) ?? claims.FindFirstValue("sub");
        var email = claims.FindFirstValue(ClaimTypes.Email) ?? claims.FindFirstValue("email");
        var nome = claims.FindFirstValue(ClaimTypes.Name) ?? claims.FindFirstValue("name");

        if (string.IsNullOrWhiteSpace(grupoIdExterno) || string.IsNullOrWhiteSpace(usuarioIdExterno) || string.IsNullOrWhiteSpace(email))
        {
            throw new InvalidOperationException("Token SSO incompleto: faltam claims obrigatórias (grupoEmpresaIdExterno, identificador do usuário ou e-mail).");
        }

        var papel = Enum.TryParse<PapelEnum>(claims.FindFirstValue(ClaimTypes.Role) ?? claims.FindFirstValue("papel"), true, out var papelParse)
            ? papelParse
            : PapelEnum.CLIENTE;

        var grupo = await grupos.ObterTodos().FirstOrDefaultAsync(g => g.IdExterno == grupoIdExterno);
        if (grupo == null)
        {
            grupo = await grupos.CriarESalvarAsync(new GrupoEmpresa
            {
                IdExterno = grupoIdExterno,
                Nome = grupoNome ?? grupoIdExterno,
                Tipo = TipoGrupoEnum.MATRIZ,
            });
        }

        var usuario = await usuarios.ObterTodos().FirstOrDefaultAsync(u => u.IdExterno == usuarioIdExterno);
        if (usuario == null)
        {
            usuario = await usuarios.CriarESalvarAsync(new Usuario
            {
                IdExterno = usuarioIdExterno,
                Nome = nome ?? email,
                Email = email,
                SenhaHash = string.Empty,
                Papel = papel,
                GrupoEmpresaId = grupo.Id,
            });
        }
        else if (usuario.Nome != (nome ?? email) || usuario.Email != email || usuario.Papel != papel || usuario.GrupoEmpresaId != grupo.Id)
        {
            usuario.Nome = nome ?? email;
            usuario.Email = email;
            usuario.Papel = papel;
            usuario.GrupoEmpresaId = grupo.Id;
            usuario = await usuarios.EditarESalvarAsync(usuario);
        }

        return usuario;
    }

    public string GerarToken(Usuario usuario)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_config["Jwt:Key"]!);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(ClaimTypes.Name, usuario.Nome),
            new Claim(ClaimTypes.Email, usuario.Email),
            new Claim(ClaimTypes.Role, usuario.Papel.ToString()),
            new Claim("GrupoEmpresaId", usuario.GrupoEmpresaId.ToString())
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(8),
            Issuer = _config["Jwt:Issuer"],
            Audience = _config["Jwt:Audience"],
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}