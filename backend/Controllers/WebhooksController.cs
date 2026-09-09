using System.Security.Claims;
using backend.Events;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMIN,Admin")]
public class WebhooksController : ControllerBase
{
    private readonly IOptionsMonitor<WebhooksOptions> _opcoes;
    private readonly IEventoService _eventos;

    public WebhooksController(IOptionsMonitor<WebhooksOptions> opcoes, IEventoService eventos)
    {
        _opcoes = opcoes;
        _eventos = eventos;
    }

    /// <summary>Lista os destinos configurados em Webhooks:Destinos, sem expor o segredo.</summary>
    [HttpGet("destinos")]
    public IActionResult ListarDestinos()
    {
        var cfg = _opcoes.CurrentValue;
        var destinos = cfg.Destinos.Select(d => new
        {
            d.Nome,
            d.Url,
            Eventos = d.EventosEfetivos,
            d.Ativo,
            PossuiSegredo = !string.IsNullOrEmpty(d.Segredo)
        });

        return Ok(new
        {
            cfg.Habilitado,
            cfg.TimeoutSegundos,
            RetryDelaysSegundos = cfg.RetryDelaysEfetivos,
            Destinos = destinos
        });
    }

    /// <summary>Publica um evento 'webhook.teste' para validar a integração dos destinos.</summary>
    [HttpPost("testar")]
    public async Task<IActionResult> Testar([FromBody] TestarWebhookDto? dto, CancellationToken ct)
    {
        var usuarioId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        var mensagem = string.IsNullOrWhiteSpace(dto?.Mensagem) ? "Evento de teste disparado manualmente." : dto!.Mensagem.Trim();

        var payload = new
        {
            Mensagem = mensagem,
            SolicitadoPorUsuarioId = int.TryParse(usuarioId, out var uid) ? uid : (int?)null,
            SolicitadoEm = DateTime.UtcNow
        };

        await _eventos.PublicarAsync("webhook.teste", null, payload, ct);

        var destinos = _opcoes.CurrentValue.Destinos.Where(d => d.AceitaEvento("webhook.teste")).Select(d => d.Nome).ToList();
        return Accepted(new
        {
            Tipo = "webhook.teste",
            EnfileiradoEm = DateTime.UtcNow,
            DestinosInscritos = destinos,
            Observacao = "Entrega assíncrona: acompanhe o resultado nos logs do WebhookDispatcher."
        });
    }
}

public record TestarWebhookDto(string? Mensagem);
