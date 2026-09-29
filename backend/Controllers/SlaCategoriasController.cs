using backend.Data.Repositories;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SlaCategoriasController : ControllerBase
{
    // Manutenção das regras de SLA altera prazos de todos os chamados futuros: restrita à gestão.
    private const string RolesGestao = "SUPERVISOR,ADMIN,Supervisor,Admin";
    private const int TamanhoMaximoTexto = 100;
    private const int TempoMaximoHoras = 24 * 365;

    private readonly IBaseRepository<SLACategoria> _slaCategorias;
    private readonly IBaseRepository<Chamado> _chamados;

    public SlaCategoriasController(IBaseRepository<SLACategoria> slaCategorias, IBaseRepository<Chamado> chamados)
    {
        _slaCategorias = slaCategorias;
        _chamados = chamados;
    }

    /// <summary>Produtos e categorias válidos para os selects do formulário de novo chamado, com os prazos de cada prioridade.</summary>
    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var regras = await _slaCategorias.ObterTodos()
            .AsNoTracking()
            .OrderBy(s => s.Produto).ThenBy(s => s.Categoria).ThenBy(s => s.Prioridade)
            .Select(s => new { s.Produto, s.Categoria, s.Prioridade, s.TempoResposta, s.TempoResolucao })
            .ToListAsync();

        var produtos = regras
            .GroupBy(r => r.Produto)
            .Select(g => new SlaProdutoDto(
                g.Key,
                g.GroupBy(r => r.Categoria)
                    .Select(gc => new SlaCategoriaItemDto(
                        gc.Key,
                        gc.Select(r => new SlaPrioridadeDto(r.Prioridade, r.TempoResposta, r.TempoResolucao)).ToList()))
                    .ToList()))
            .ToList();

        return Ok(produtos);
    }

    // =====================================================================
    // CRUD das regras (uma linha por Produto x Categoria x Prioridade)
    // =====================================================================

    /// <summary>Lista plana das regras cadastradas, com o Id e a quantidade de chamados vinculados.</summary>
    [HttpGet("regras")]
    [Authorize(Roles = RolesGestao)]
    public async Task<IActionResult> ListarRegras()
    {
        var regras = await _slaCategorias.ObterTodos()
            .AsNoTracking()
            .OrderBy(s => s.Produto).ThenBy(s => s.Categoria).ThenBy(s => s.Prioridade)
            .Select(s => new SlaCategoriaRegraDto(
                s.Id, s.Produto, s.Categoria, s.Prioridade, s.TempoResposta, s.TempoResolucao, s.Chamados.Count))
            .ToListAsync();

        return Ok(regras);
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = RolesGestao)]
    public async Task<IActionResult> ObterPorId(int id)
    {
        var regra = await _slaCategorias.ObterTodos()
            .AsNoTracking()
            .Where(s => s.Id == id)
            .Select(s => new SlaCategoriaRegraDto(
                s.Id, s.Produto, s.Categoria, s.Prioridade, s.TempoResposta, s.TempoResolucao, s.Chamados.Count))
            .FirstOrDefaultAsync();

        return regra is null ? NotFound("Regra de SLA não encontrada.") : Ok(regra);
    }

    [HttpPost]
    [Authorize(Roles = RolesGestao)]
    public async Task<IActionResult> Criar([FromBody] SalvarSlaCategoriaDto dto)
    {
        if (Validar(dto) is { } erro) return BadRequest(erro);

        var produto = dto.Produto.Trim();
        var categoria = dto.Categoria.Trim();

        if (await ExisteCombinacao(produto, categoria, dto, ignorarId: null))
            return Conflict("Já existe uma regra de SLA para este produto, categoria e prioridade.");

        var regra = new SLACategoria
        {
            Produto = produto,
            Categoria = categoria,
            Prioridade = dto.Prioridade,
            TempoResposta = dto.TempoRespostaHoras,
            TempoResolucao = dto.TempoResolucaoHoras
        };

        await _slaCategorias.CriarESalvarAsync(regra);

        return CreatedAtAction(nameof(ObterPorId), new { id = regra.Id }, Mapear(regra, chamadosVinculados: 0));
    }

    /// <summary>
    /// Altera a regra. Chamados já abertos mantêm os prazos calculados na abertura;
    /// os novos tempos valem apenas para chamados criados depois.
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = RolesGestao)]
    public async Task<IActionResult> Editar(int id, [FromBody] SalvarSlaCategoriaDto dto)
    {
        if (Validar(dto) is { } erro) return BadRequest(erro);

        var regra = await _slaCategorias.ObterAsync(id);
        if (regra is null) return NotFound("Regra de SLA não encontrada.");

        var produto = dto.Produto.Trim();
        var categoria = dto.Categoria.Trim();

        if (await ExisteCombinacao(produto, categoria, dto, ignorarId: id))
            return Conflict("Já existe uma regra de SLA para este produto, categoria e prioridade.");

        regra.Produto = produto;
        regra.Categoria = categoria;
        regra.Prioridade = dto.Prioridade;
        regra.TempoResposta = dto.TempoRespostaHoras;
        regra.TempoResolucao = dto.TempoResolucaoHoras;

        await _slaCategorias.SalvarAlteracoesAsync();

        return Ok(Mapear(regra, await ContarChamados(id)));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RolesGestao)]
    public async Task<IActionResult> Excluir(int id)
    {
        var regra = await _slaCategorias.ObterAsync(id);
        if (regra is null) return NotFound("Regra de SLA não encontrada.");

        // A FK Chamado.SlaCategoriaId é Restrict: excluir uma regra em uso quebraria o histórico de prazos.
        var vinculados = await ContarChamados(id);
        if (vinculados > 0)
            return Conflict($"Esta regra de SLA está vinculada a {vinculados} chamado(s) e não pode ser excluída.");

        _slaCategorias.Delete(id);
        await _slaCategorias.SalvarAlteracoesAsync();

        return NoContent();
    }

    // =====================================================================
    // Auxiliares
    // =====================================================================

    private static string? Validar(SalvarSlaCategoriaDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Produto) || string.IsNullOrWhiteSpace(dto.Categoria))
            return "Produto e Categoria são obrigatórios.";

        if (dto.Produto.Trim().Length > TamanhoMaximoTexto || dto.Categoria.Trim().Length > TamanhoMaximoTexto)
            return $"Produto e Categoria devem ter no máximo {TamanhoMaximoTexto} caracteres.";

        if (!Enum.IsDefined(dto.Prioridade))
            return "Prioridade inválida.";

        if (dto.TempoRespostaHoras < 1 || dto.TempoResolucaoHoras < 1)
            return "Os tempos de resposta e de resolução devem ser de pelo menos 1 hora.";

        if (dto.TempoRespostaHoras > TempoMaximoHoras || dto.TempoResolucaoHoras > TempoMaximoHoras)
            return $"Os tempos de resposta e de resolução devem ser de no máximo {TempoMaximoHoras} horas.";

        if (dto.TempoRespostaHoras > dto.TempoResolucaoHoras)
            return "O tempo de resposta não pode ser maior que o tempo de resolução.";

        return null;
    }

    // ToLower() (em vez de ILike) traduz tanto para PostgreSQL quanto para SQLite (ApiRegressionTests.cs).
    private Task<bool> ExisteCombinacao(string produto, string categoria, SalvarSlaCategoriaDto dto, int? ignorarId)
    {
        var produtoNormalizado = produto.ToLower();
        var categoriaNormalizada = categoria.ToLower();

        return _slaCategorias.ObterTodos()
            .AsNoTracking()
            .AnyAsync(s =>
                (ignorarId == null || s.Id != ignorarId) &&
                s.Prioridade == dto.Prioridade &&
                s.Produto.ToLower() == produtoNormalizado &&
                s.Categoria.ToLower() == categoriaNormalizada);
    }

    private Task<int> ContarChamados(int slaCategoriaId) =>
        _chamados.ObterTodos().AsNoTracking().CountAsync(c => c.SlaCategoriaId == slaCategoriaId);

    private static SlaCategoriaRegraDto Mapear(SLACategoria s, int chamadosVinculados) => new(
        s.Id, s.Produto, s.Categoria, s.Prioridade, s.TempoResposta, s.TempoResolucao, chamadosVinculados);
}
