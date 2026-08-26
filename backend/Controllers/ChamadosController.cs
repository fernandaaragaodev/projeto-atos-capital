using System.Security.Claims;
using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChamadosController : ControllerBase
{
    private readonly AppDbContext _context;

    public ChamadosController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Chamados
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Chamado>>> GetChamados()
    {
        var usuarioIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var papelClaim = User.FindFirstValue(ClaimTypes.Role);

        if (usuarioIdClaim == null) return Unauthorized();

        var usuarioId = int.Parse(usuarioIdClaim);

        IQueryable<Chamado> query = _context.Chamados
            .Include(c => c.Usuario)
            .Include(c => c.GrupoEmpresa)
            .Include(c => c.Agente);

        if (papelClaim == PapelUsuario.Cliente.ToString())
        {
            query = query.Where(c => c.UsuarioId == usuarioId);
        }

        return await query.ToListAsync();
    }

    // POST: api/Chamados
    [HttpPost]
    public async Task<ActionResult<Chamado>> CriarChamado([FromBody] Chamado chamado)
    {
        var usuarioIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var grupoIdClaim = User.FindFirstValue("GrupoEmpresaId");

        if (usuarioIdClaim == null || grupoIdClaim == null) return Unauthorized();

        chamado.UsuarioId = int.Parse(usuarioIdClaim);
        chamado.GrupoEmpresaId = int.Parse(grupoIdClaim);
        chamado.CodigoPublico = $"ATOS-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..4].ToUpper()}";
        chamado.CriadoEm = DateTime.UtcNow;
        chamado.Status = StatusChamado.Aberto;

        _context.Chamados.Add(chamado);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetChamados), new { id = chamado.Id }, chamado);
    }

    // PATCH: api/Chamados/{id}/atribuir
    [HttpPatch("{id}/atribuir")]
    [Authorize(Roles = "Agente,Supervisor,Admin")]
    public async Task<IActionResult> AtribuirAgente(int id, [FromBody] int agenteId)
    {
        var chamado = await _context.Chamados.FindAsync(id);
        if (chamado == null) return NotFound("Chamado não encontrado.");

        chamado.AgenteId = agenteId;
        chamado.Status = StatusChamado.EmAndamento; // Ajustado para EmAndamento

        await _context.SaveChangesAsync();
        return NoContent();
    }
}