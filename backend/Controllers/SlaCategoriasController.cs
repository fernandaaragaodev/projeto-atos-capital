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
    private readonly IBaseRepository<SLACategoria> _slaCategorias;

    public SlaCategoriasController(IBaseRepository<SLACategoria> slaCategorias)
    {
        _slaCategorias = slaCategorias;
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
}
