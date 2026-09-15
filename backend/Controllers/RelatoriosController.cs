using System.Security.Claims;
using backend.DTOs;
using backend.Enums;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// RF08 — Relatórios gerenciais; RF07/RF09 — consultas de SLA e alertas. Acesso restrito a SUPERVISOR/ADMIN.
/// Filtros comuns (query): dataInicio, dataFim, grupoEmpresaId, agenteId, produto.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SUPERVISOR,ADMIN,Supervisor,Admin")]
[Produces("application/json")]
public class RelatoriosController : ControllerBase
{
    private readonly RelatorioService _relatorioService;
    private readonly SlaMonitorService _slaMonitor;

    public RelatoriosController(RelatorioService relatorioService, SlaMonitorService slaMonitor)
    {
        _relatorioService = relatorioService;
        _slaMonitor = slaMonitor;
    }

    private ActionResult? ValidarFiltro(FiltroRelatorioDto filtro)
    {
        var erro = RelatorioService.ValidarFiltro(filtro);
        return erro == null ? null : BadRequest(new { mensagem = erro });
    }

    // ------------------------------------------------------------------ RF08

    /// <summary>Visão geral: totais por status, abertos hoje, resolvidos no período, tempos médios e % dentro do SLA.</summary>
    [HttpGet("resumo")]
    [ProducesResponseType(typeof(ResumoRelatorioDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ResumoRelatorioDto>> ObterResumo([FromQuery] FiltroRelatorioDto filtro, CancellationToken ct)
    {
        if (ValidarFiltro(filtro) is { } erro) return erro;
        return Ok(await _relatorioService.GerarResumoAsync(filtro, ct));
    }

    /// <summary>Desempenho por agente: atribuídos, resolvidos, abertos, tempo médio de resolução e % de SLA cumprido.</summary>
    [HttpGet("por-agente")]
    [ProducesResponseType(typeof(List<RelatorioPorAgenteDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<RelatorioPorAgenteDto>>> ObterPorAgente([FromQuery] FiltroRelatorioDto filtro, CancellationToken ct)
    {
        if (ValidarFiltro(filtro) is { } erro) return erro;
        return Ok(await _relatorioService.GerarPorAgenteAsync(filtro, ct));
    }

    [HttpGet("por-status")]
    [ProducesResponseType(typeof(List<TotalPorStatusDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<TotalPorStatusDto>>> ObterPorStatus([FromQuery] FiltroRelatorioDto filtro, CancellationToken ct)
    {
        if (ValidarFiltro(filtro) is { } erro) return erro;
        return Ok(await _relatorioService.GerarPorStatusAsync(filtro, ct));
    }

    [HttpGet("por-prioridade")]
    [ProducesResponseType(typeof(List<TotalPorPrioridadeDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<TotalPorPrioridadeDto>>> ObterPorPrioridade([FromQuery] FiltroRelatorioDto filtro, CancellationToken ct)
    {
        if (ValidarFiltro(filtro) is { } erro) return erro;
        return Ok(await _relatorioService.GerarPorPrioridadeAsync(filtro, ct));
    }

    /// <summary>Série temporal de chamados abertos x resolvidos. granularidade = dia | semana | mes (default dia).</summary>
    [HttpGet("evolucao")]
    [ProducesResponseType(typeof(EvolucaoRelatorioDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<EvolucaoRelatorioDto>> ObterEvolucao([FromQuery] FiltroRelatorioDto filtro, [FromQuery] string granularidade = "dia", CancellationToken ct = default)
    {
        if (ValidarFiltro(filtro) is { } erro) return erro;
        if (!RelatorioService.GranularidadesValidas.Contains((granularidade ?? "").Trim().ToLowerInvariant()))
            return BadRequest(new { mensagem = "granularidade deve ser dia, semana ou mes." });
        return Ok(await _relatorioService.GerarEvolucaoAsync(filtro, granularidade!, ct));
    }

    /// <summary>SLA de resolução e de resposta cumprido/violado/pendente por produto, categoria e prioridade.</summary>
    [HttpGet("sla")]
    [ProducesResponseType(typeof(RelatorioSlaDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<RelatorioSlaDto>> ObterSla([FromQuery] FiltroRelatorioDto filtro, CancellationToken ct)
    {
        if (ValidarFiltro(filtro) is { } erro) return erro;
        return Ok(await _relatorioService.GerarSlaAsync(filtro, ct));
    }

    [HttpGet("por-produto")]
    [ProducesResponseType(typeof(List<TotalPorProdutoDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<TotalPorProdutoDto>>> ObterPorProduto([FromQuery] FiltroRelatorioDto filtro, CancellationToken ct)
    {
        if (ValidarFiltro(filtro) is { } erro) return erro;
        return Ok(await _relatorioService.GerarPorProdutoAsync(filtro, ct));
    }

    [HttpGet("por-grupo-empresa")]
    [ProducesResponseType(typeof(List<TotalPorGrupoEmpresaDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<TotalPorGrupoEmpresaDto>>> ObterPorGrupoEmpresa([FromQuery] FiltroRelatorioDto filtro, CancellationToken ct)
    {
        if (ValidarFiltro(filtro) is { } erro) return erro;
        return Ok(await _relatorioService.GerarPorGrupoEmpresaAsync(filtro, ct));
    }

    [HttpGet("por-categoria")]
    [ProducesResponseType(typeof(List<TotalPorCategoriaDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<TotalPorCategoriaDto>>> ObterPorCategoria([FromQuery] FiltroRelatorioDto filtro, CancellationToken ct)
    {
        if (ValidarFiltro(filtro) is { } erro) return erro;
        return Ok(await _relatorioService.GerarPorCategoriaAsync(filtro, ct));
    }

    // ------------------------------------------------------------------ RF07

    /// <summary>Chamados abertos com prazo de resolução em até N horas (default 2) ou já estourado. Retorna DTO (sem dados sensíveis).</summary>
    [HttpGet("em-risco-sla")]
    [ProducesResponseType(typeof(List<ChamadoEmRiscoSlaDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ChamadoEmRiscoSlaDto>>> ObterChamadosEmRiscoSLA([FromQuery] FiltroRelatorioDto filtro, [FromQuery] double janelaHoras = 2, CancellationToken ct = default)
    {
        if (ValidarFiltro(filtro) is { } erro) return erro;
        if (janelaHoras < 0 || janelaHoras > 24 * 365) return BadRequest(new { mensagem = "janelaHoras inválida." });
        return Ok(await _relatorioService.ListarChamadosEmRiscoSLAAsync(filtro, janelaHoras, ct));
    }

    // ------------------------------------------------------------------ RF09

    /// <summary>Histórico de alertas de SLA. apenasPendentes=true (default) lista só os não reconhecidos.</summary>
    [HttpGet("alertas-sla")]
    [ProducesResponseType(typeof(List<AlertaSlaDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<AlertaSlaDto>>> ListarAlertasSla(
        [FromQuery] bool apenasPendentes = true,
        [FromQuery] TipoAlertaSlaEnum? tipo = null,
        [FromQuery] int? chamadoId = null,
        [FromQuery] int? grupoEmpresaId = null,
        CancellationToken ct = default)
    {
        if (tipo.HasValue && !Enum.IsDefined(tipo.Value)) return BadRequest(new { mensagem = "tipo inválido." });
        if (chamadoId is <= 0 || grupoEmpresaId is <= 0) return BadRequest(new { mensagem = "identificador inválido." });
        return Ok(await _relatorioService.ListarAlertasSlaAsync(apenasPendentes, tipo, chamadoId, grupoEmpresaId, ct));
    }

    /// <summary>Marca um alerta como reconhecido pelo usuário logado (auditado). 404 se não existe, 409 se já reconhecido.</summary>
    [HttpPatch("alertas-sla/{id:int}/reconhecer")]
    [ProducesResponseType(typeof(AlertaSlaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AlertaSlaDto>> ReconhecerAlertaSla(int id, CancellationToken ct)
    {
        var usuarioIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!int.TryParse(usuarioIdClaim, out var usuarioId))
            return Unauthorized(new { mensagem = "Token sem identificador de usuário." });

        var resultado = await _relatorioService.ReconhecerAlertaSlaAsync(id, usuarioId, ct);
        return resultado switch
        {
            RelatorioService.ResultadoReconhecimento.NaoEncontrado => NotFound(new { mensagem = "Alerta não encontrado." }),
            RelatorioService.ResultadoReconhecimento.JaReconhecido => Conflict(new { mensagem = "Alerta já foi reconhecido." }),
            _ => Ok(await _relatorioService.ObterAlertaSlaAsync(id, ct))
        };
    }

    /// <summary>Força um ciclo do monitor de SLA imediatamente (útil para operação/testes). Somente ADMIN.</summary>
    [HttpPost("alertas-sla/verificar")]
    [Authorize(Roles = "ADMIN,Admin")]
    [ProducesResponseType(typeof(StatusMonitorSlaDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<StatusMonitorSlaDto>> VerificarSlaAgora(CancellationToken ct)
    {
        var disparados = await _slaMonitor.ExecutarCicloAsync(ct);
        return Ok(new StatusMonitorSlaDto(_slaMonitor.UltimaExecucaoEm, _slaMonitor.TotalCiclos, _slaMonitor.TotalAlertasDisparados, _slaMonitor.UltimoErro, disparados));
    }
}
