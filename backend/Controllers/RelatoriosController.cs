using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SUPERVISOR,ADMIN,Supervisor,Admin")]
public class RelatoriosController : ControllerBase
{
    private readonly RelatorioService _relatorioService;

    public RelatoriosController(RelatorioService relatorioService)
    {
        _relatorioService = relatorioService;
    }

    [HttpGet("em-risco-sla")]
    public async Task<IActionResult> ObterChamadosEmRiscoSLA()
    {
        var resultado = await _relatorioService.ListarChamadosEmRiscoSLAAsync();
        return Ok(resultado);
    }

    [HttpGet("por-produto")]
    public async Task<IActionResult> ObterPorProduto()
    {
        var resultado = await _relatorioService.GerarPorProdutoAsync();
        return Ok(resultado);
    }

    [HttpGet("por-grupo-empresa")]
    public async Task<IActionResult> ObterPorGrupoEmpresa()
    {
        var resultado = await _relatorioService.GerarPorGrupoEmpresaAsync();
        return Ok(resultado);
    }

    [HttpGet("por-categoria")]
    public async Task<IActionResult> ObterPorCategoria()
    {
        var resultado = await _relatorioService.GerarPorCategoriaAsync();
        return Ok(resultado);
    }
}