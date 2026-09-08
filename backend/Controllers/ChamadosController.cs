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
        var grupoClaim = User.FindFirstValue("GrupoEmpresaId") ?? User.FindFirstValue("grupo_empresa_id");
        var grupoEmpresaId = int.TryParse(grupoClaim, out var gId) ? gId : 0;

        var papelClaim = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("papel") ?? "CLIENTE";
        Enum.TryParse<PapelEnum>(papelClaim, true, out var papel);

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

    [HttpGet("agentes-disponiveis")]
    [Authorize(Roles = "AGENTE,SUPERVISOR,ADMIN,Agente,Supervisor,Admin")]
    public async Task<IActionResult> ObterAgentesDisponiveis()
    {
        // Obtém os IDs dos agentes associados a chamados ATIVOS (sem data de resolução e sem data de fechamento)
        var agentesOcupadosIds = await _context.Chamados
            .Where(c => c.AgenteId.HasValue && c.ResolvidoEm == null && c.FechadoEm == null)
            .Select(c => c.AgenteId!.Value)
            .Distinct()
            .ToListAsync();

        // Filtra os usuários com papel AGENTE que NÃO estão ocupados
        var agentesDisponiveis = await _context.Usuarios
            .Where(u => u.Papel == PapelEnum.AGENTE && !agentesOcupadosIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                u.Nome,
                u.Email
            })
            .ToListAsync();

        return Ok(agentesDisponiveis);
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] CriarChamadoDto dto)
    {
        // Extração segura das claims enviadas pelo JWT (suporta padrão C# e SSO Atos)
        var usuarioIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        var grupoClaim = User.FindFirstValue("GrupoEmpresaId") ?? User.FindFirstValue("grupo_empresa_id");

        if (string.IsNullOrEmpty(usuarioIdClaim) || !int.TryParse(usuarioIdClaim, out var usuarioId))
        {
            return BadRequest("A claim com o ID do usuário (NameIdentifier/sub) é obrigatória no JWT.");
        }

        if (string.IsNullOrEmpty(grupoClaim) || !int.TryParse(grupoClaim, out var grupoEmpresaId))
        {
            return BadRequest("A claim 'GrupoEmpresaId' (ou 'grupo_empresa_id') é obrigatória no JWT.");
        }

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

        // 1. Buscar Regra de SLA
        var slaRule = await _context.SLACategorias
            .FirstOrDefaultAsync(s => s.Produto == dto.Produto && s.Categoria == dto.Categoria && s.Prioridade == dto.Prioridade);

        if (slaRule != null)
        {
            chamado.SlaCategoriaId = slaRule.Id;
            chamado.PrazoResposta = slaRule.CalcularPrazoResposta(chamado.CriadoEm);
            chamado.PrazoResolucao = slaRule.CalcularPrazoResolucao(chamado.CriadoEm);
        }

        // 2. ATRIBUIÇÃO AUTOMÁTICA: Buscar o primeiro agente livre
        var agentesOcupadosIds = await _context.Chamados
            .Where(c => c.AgenteId.HasValue && c.ResolvidoEm == null && c.FechadoEm == null)
            .Select(c => c.AgenteId!.Value)
            .Distinct()
            .ToListAsync();

        var primeiroAgenteLivre = await _context.Usuarios
            .Where(u => u.Papel == PapelEnum.AGENTE && !agentesOcupadosIds.Contains(u.Id))
            .FirstOrDefaultAsync();

        // Se encontrou agente livre, associa e atualiza o status para EM_ANDAMENTO
        if (primeiroAgenteLivre != null)
        {
            chamado.AtribuirAgente(primeiroAgenteLivre.Id);
        }

        _context.Chamados.Add(chamado);

        // 3. Registrar Log de Auditoria
        _context.LogsAuditoria.Add(new LogAuditoria
        {
            Chamado = chamado,
            UsuarioId = usuarioId,
            Acao = "CRIAR_CHAMADO",
            CampoAlterado = "Status",
            ValorAnterior = "-",
            ValorNovo = chamado.Status.ToString(),
            Data = DateTime.UtcNow
        });

        // Se foi atribuído, registra o log de atribuição na mesma transação
        if (primeiroAgenteLivre != null)
        {
            _context.LogsAuditoria.Add(new LogAuditoria
            {
                Chamado = chamado,
                UsuarioId = usuarioId,
                Acao = "ATRIBUICAO_AUTOMATICA",
                CampoAlterado = "AgenteId",
                ValorAnterior = "Nenhum",
                ValorNovo = primeiroAgenteLivre.Id.ToString(),
                Data = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(Listar), new { id = chamado.Id }, chamado);
    }

    [HttpPatch("{id}/atribuir")]
    [Authorize(Roles = "AGENTE,SUPERVISOR,ADMIN,Agente,Supervisor,Admin")]
    public async Task<IActionResult> AtribuirAgente(int id, [FromBody] int agenteId)
    {
        var chamado = await _context.Chamados.FindAsync(id);
        if (chamado == null) return NotFound("Chamado não encontrado.");

        var agenteExiste = await _context.Usuarios.AnyAsync(u => u.Id == agenteId && u.Papel == PapelEnum.AGENTE);
        if (!agenteExiste) return BadRequest($"Agente com ID {agenteId} inválido ou não encontrado.");

        var usuarioLogadoIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        var usuarioLogadoId = int.Parse(usuarioLogadoIdClaim!);

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

        var usuarioIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        var usuarioId = int.Parse(usuarioIdClaim!);

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

        // Atualiza a data de controle no Chamado
        chamado.AguardandoDesde = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(interacao);
    }
}