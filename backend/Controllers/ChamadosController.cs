using System.Security.Claims;
using backend.Data;
using backend.DTOs;
using backend.Enums;
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

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var grupoEmpresaId = int.Parse(User.FindFirstValue("GrupoEmpresaId") ?? "0");
        var papel = Enum.Parse<PapelEnum>(User.FindFirstValue(ClaimTypes.Role) ?? "CLIENTE");

        IQueryable<Chamado> query = _context.Chamados
            .Include(c => c.Usuario)
            .Include(c => c.Agente)
            .Include(c => c.GrupoEmpresa)
            .Include(c => c.Interacoes);

        // Clientes só enxergam chamados do seu próprio GrupoEmpresa
        if (papel == PapelEnum.CLIENTE)
        {
            query = query.Where(c => c.GrupoEmpresaId == grupoEmpresaId);
        }

        var chamados = await query.ToListAsync();
        return Ok(chamados);
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] CriarChamadoDto dto)
    {
        var usuarioId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var grupoEmpresaId = int.Parse(User.FindFirstValue("GrupoEmpresaId")!);

        var chamado = new Chamado
        {
            Produto = dto.Produto,
            Categoria = dto.Categoria,
            Descricao = dto.Descricao,
            Prioridade = dto.Prioridade,
            UsuarioId = usuarioId,
            GrupoEmpresaId = grupoEmpresaId,
            Status = StatusEnum.ABERTO,
            CriadoEm = DateTime.UtcNow
        };

        chamado.GerarCodigoPublico();

        // Buscar Regra de SLA
        var slaRule = await _context.SLACategorias
            .FirstOrDefaultAsync(s => s.Produto == dto.Produto && s.Categoria == dto.Categoria && s.Prioridade == dto.Prioridade);

        if (slaRule != null)
        {
            chamado.SlaCategoriaId = slaRule.Id;
            chamado.PrazoResposta = slaRule.CalcularPrazoResposta(chamado.CriadoEm);
            chamado.PrazoResolucao = slaRule.CalcularPrazoResolucao(chamado.CriadoEm);
        }

        _context.Chamados.Add(chamado);
        await _context.SaveChangesAsync();

        // Registrar Log de Auditoria
        _context.LogsAuditoria.Add(new LogAuditoria
        {
            ChamadoId = chamado.Id,
            UsuarioId = usuarioId,
            Acao = "CRIAR_CHAMADO",
            CampoAlterado = "Status",
            ValorAnterior = "-",
            ValorNovo = StatusEnum.ABERTO.ToString(),
            Data = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(Listar), new { id = chamado.Id }, chamado);
    }

    [HttpPatch("{id}/atribuir")]
    [Authorize(Roles = "AGENTE,SUPERVISOR,ADMIN,Agente,Supervisor,Admin")]
    public async Task<IActionResult> AtribuirAgente(int id, [FromBody] int agenteId)
    {
        var chamado = await _context.Chamados.FindAsync(id);
        if (chamado == null) return NotFound("Chamado não encontrado.");

        var agenteExiste = await _context.Usuarios.AnyAsync(u => u.Id == agenteId);
        if (!agenteExiste) return BadRequest($"Agente com ID {agenteId} não existe.");

        var usuarioLogadoId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var agenteAnterior = chamado.AgenteId?.ToString() ?? "Nenhum";
        chamado.AtribuirAgente(agenteId);

        _context.LogsAuditoria.Add(new LogAuditoria
        {
            ChamadoId = chamado.Id,
            UsuarioId = usuarioLogadoId,
            Acao = "ATRIBUIR_AGENTE",
            CampoAlterado = "AgenteId",
            ValorAnterior = agenteAnterior,
            ValorNovo = agenteId.ToString(),
            Data = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/interacoes")]
    public async Task<IActionResult> AdicionarInteracao(int id, [FromBody] CriarInteracaoDto dto)
    {
        var chamado = await _context.Chamados.FindAsync(id);
        if (chamado == null) return NotFound("Chamado não encontrado.");

        var usuarioId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var interacao = new Interacao
        {
            ChamadoId = id,
            AutorId = usuarioId,
            Mensagem = dto.Mensagem,
            Tipo = dto.Tipo,
            Anexos = dto.Anexos,
            CriadoEm = DateTime.UtcNow
        };

        _context.Interacoes.Add(interacao);
        await _context.SaveChangesAsync();

        return Ok(interacao);
    }
}