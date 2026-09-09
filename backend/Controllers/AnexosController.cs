using System.Security.Claims;
using backend.Data.Repositories;
using backend.Enums;
using backend.Events;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

/// <summary>
/// RF11 — Anexos de um chamado. Cada upload vira uma Interacao PUBLICA cujo campo Anexos
/// guarda um JSON array de <see cref="AnexoInfo"/>. Os arquivos NÃO são servidos como static files:
/// o download passa por autorização (papel + grupo) e valida que o arquivo pertence ao chamado.
/// </summary>
[ApiController]
[Route("api/Chamados/{id:int}/anexos")]
[Authorize]
public class AnexosController : ControllerBase
{
    // Limite da requisição multipart: 10 arquivos x 10 MB (defaults de Anexos:*) + folga para os campos do form.
    private const long LimiteRequisicaoBytes = 105L * 1024 * 1024;
    private const string MensagemPadrao = "Anexo(s) enviado(s)";

    private static readonly PapelEnum[] PapeisInternos = [PapelEnum.AGENTE, PapelEnum.SUPERVISOR, PapelEnum.ADMIN];

    private readonly IBaseRepository<Chamado> _chamados;
    private readonly IBaseRepository<Interacao> _interacoes;
    private readonly IBaseRepository<LogAuditoria> _logsAuditoria;
    private readonly ArquivoService _arquivos;
    private readonly IEventoService _eventos;
    private readonly ILogger<AnexosController> _logger;

    public AnexosController(IBaseRepository<Chamado> chamados, IBaseRepository<Interacao> interacoes,
        IBaseRepository<LogAuditoria> logsAuditoria, ArquivoService arquivos, IEventoService eventos,
        ILogger<AnexosController> logger)
    {
        _chamados = chamados;
        _interacoes = interacoes;
        _logsAuditoria = logsAuditoria;
        _arquivos = arquivos;
        _eventos = eventos;
        _logger = logger;
    }

    // ---------------------------------------------------------------- POST /api/Chamados/{id}/anexos

    /// <summary>Envia um ou mais arquivos (campo 'arquivos') e opcionalmente uma 'mensagem'.</summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(LimiteRequisicaoBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = LimiteRequisicaoBytes, ValueLengthLimit = 4096)]
    public async Task<IActionResult> Enviar(int id, [FromForm] EnviarAnexosForm form, CancellationToken ct)
    {
        var usuario = LerUsuario();
        if (usuario is null) return Unauthorized("Token sem a claim de identificação do usuário.");

        var chamado = await _chamados.ObterTodos().AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
        if (chamado is null) return NotFound("Chamado não encontrado.");
        if (!PodeAcessar(usuario.Value, chamado)) return Forbid();

        var arquivos = (form.Arquivos ?? []).Where(a => a is { Length: > 0 }).ToList();
        if (arquivos.Count == 0) return BadRequest("Envie ao menos um arquivo no campo 'arquivos'.");
        if (arquivos.Count > _arquivos.MaxArquivosPorEnvio)
            return BadRequest($"Máximo de {_arquivos.MaxArquivosPorEnvio} arquivo(s) por envio.");

        // 1. Valida TODOS antes de gravar qualquer um (tudo ou nada).
        var erros = new List<string>();
        foreach (var arquivo in arquivos)
        {
            try { await _arquivos.ValidarAsync(arquivo, ct); }
            catch (ArquivoInvalidoException ex) { erros.Add(ex.Message); }
        }
        if (erros.Count > 0) return BadRequest(new { Mensagem = "Um ou mais arquivos foram rejeitados.", Erros = erros });

        // 2. Grava em disco.
        var salvos = new List<AnexoInfo>();
        try
        {
            foreach (var arquivo in arquivos)
                salvos.Add(await _arquivos.SalvarAsync(arquivo, id, ct));

            // 3. Interação PUBLICA + auditoria na mesma transação.
            var mensagem = string.IsNullOrWhiteSpace(form.Mensagem) ? MensagemPadrao : form.Mensagem.Trim();

            var interacao = new Interacao
            {
                ChamadoId = id,
                AutorId = usuario.Value.Id,
                Tipo = TipoInteracaoEnum.PUBLICA,
                Mensagem = mensagem,
                Anexos = ArquivoService.Serializar(salvos),
                CriadoEm = DateTime.UtcNow
            };
            _interacoes.Add(interacao);

            _logsAuditoria.Add(new LogAuditoria
            {
                ChamadoId = id,
                UsuarioId = usuario.Value.Id,
                Acao = "ANEXAR_ARQUIVO",
                CampoAlterado = "Interacao.Anexos",
                ValorAnterior = "-",
                ValorNovo = string.Join("; ", salvos.Select(a => $"{a.NomeOriginal} ({a.NomeArmazenado}, {a.TamanhoBytes} bytes)")),
                Data = DateTime.UtcNow
            });

            await _chamados.SalvarAlteracoesAsync(ct);

            // 4. Evento (assíncrono; falha de webhook não afeta a resposta).
            await _eventos.PublicarAsync(TiposEvento.AnexoAdicionado, id, new
            {
                ChamadoId = id,
                chamado.CodigoPublico,
                chamado.GrupoEmpresaId,
                InteracaoId = interacao.Id,
                AutorId = usuario.Value.Id,
                Mensagem = mensagem,
                Anexos = salvos
            }, ct);

            var resposta = new
            {
                InteracaoId = interacao.Id,
                ChamadoId = id,
                interacao.Tipo,
                interacao.Mensagem,
                interacao.CriadoEm,
                Anexos = salvos
            };
            return Created(ArquivoService.MontarUrl(id, string.Empty).TrimEnd('/'), resposta);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Desfaz os arquivos já gravados para não deixar órfãos em disco.
            foreach (var a in salvos) _arquivos.TentarRemover(a.NomeArmazenado);
            _logger.LogError(ex, "Falha ao anexar arquivos ao chamado {ChamadoId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError, "Não foi possível salvar os anexos.");
        }
    }

    // ---------------------------------------------------------------- GET /api/Chamados/{id}/anexos

    /// <summary>Lista consolidada dos anexos de todas as interações do chamado.</summary>
    [HttpGet]
    public async Task<IActionResult> Listar(int id, CancellationToken ct)
    {
        var usuario = LerUsuario();
        if (usuario is null) return Unauthorized("Token sem a claim de identificação do usuário.");

        var chamado = await _chamados.ObterTodos().AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
        if (chamado is null) return NotFound("Chamado não encontrado.");
        if (!PodeAcessar(usuario.Value, chamado)) return Forbid();

        var interacoes = await InteracoesVisiveis(id, usuario.Value.Papel)
            .Where(i => i.Anexos != null && i.Anexos != "")
            .OrderBy(i => i.CriadoEm)
            .Select(i => new { i.Id, i.Tipo, i.CriadoEm, i.AutorId, AutorNome = i.Autor.Nome, i.Anexos })
            .ToListAsync(ct);

        var lista = interacoes
            .SelectMany(i => ArquivoService.Desserializar(i.Anexos).Select(a => new
            {
                InteracaoId = i.Id,
                TipoInteracao = i.Tipo,
                EnviadoEm = i.CriadoEm,
                i.AutorId,
                i.AutorNome,
                a.NomeOriginal,
                a.NomeArmazenado,
                a.ContentType,
                a.TamanhoBytes,
                Url = ArquivoService.MontarUrl(id, a.NomeArmazenado)
            }))
            .ToList();

        return Ok(new { ChamadoId = id, Total = lista.Count, Anexos = lista });
    }

    // ---------------------------------------------------------------- GET /api/Chamados/{id}/anexos/{nomeArmazenado}

    /// <summary>Download de um anexo. O nome deve pertencer a uma interação deste chamado.</summary>
    [HttpGet("{nomeArmazenado}")]
    public async Task<IActionResult> Baixar(int id, string nomeArmazenado, CancellationToken ct)
    {
        // Só aceitamos o padrão gerado pelo servidor (32 hex + extensão da whitelist) -> sem path traversal.
        if (!ArquivoService.NomeArmazenadoValido(nomeArmazenado))
            return BadRequest("Nome de arquivo inválido.");

        var usuario = LerUsuario();
        if (usuario is null) return Unauthorized("Token sem a claim de identificação do usuário.");

        var chamado = await _chamados.ObterTodos().AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
        if (chamado is null) return NotFound("Chamado não encontrado.");
        if (!PodeAcessar(usuario.Value, chamado)) return Forbid();

        // Procura o anexo entre as interações DESTE chamado (o nome é único, mas exigimos o vínculo).
        var candidatas = await _interacoes.ObterTodos().AsNoTracking()
            .Where(i => i.ChamadoId == id && i.Anexos != null && i.Anexos!.Contains(nomeArmazenado))
            .Select(i => new { i.Tipo, i.Anexos })
            .ToListAsync(ct);

        var encontrado = candidatas
            .Select(i => new { i.Tipo, Anexo = ArquivoService.Desserializar(i.Anexos).FirstOrDefault(a => a.NomeArmazenado == nomeArmazenado) })
            .FirstOrDefault(x => x.Anexo is not null);

        if (encontrado is null) return NotFound("Anexo não encontrado neste chamado.");

        // Cliente não enxerga anexos de notas internas: o recurso existe, acesso negado.
        if (usuario.Value.Papel == PapelEnum.CLIENTE && encontrado.Tipo != TipoInteracaoEnum.PUBLICA)
            return Forbid();

        var stream = _arquivos.Abrir(nomeArmazenado);
        if (stream is null)
        {
            _logger.LogWarning("Anexo {Nome} do chamado {ChamadoId} referenciado no banco mas ausente no disco", nomeArmazenado, id);
            return NotFound("Arquivo não encontrado no armazenamento.");
        }

        Response.Headers["X-Content-Type-Options"] = "nosniff";
        // FileStreamResult com fileDownloadName gera Content-Disposition: attachment (não renderiza inline).
        return File(stream, encontrado.Anexo!.ContentType, encontrado.Anexo.NomeOriginal, enableRangeProcessing: true);
    }

    // ---------------------------------------------------------------- helpers

    private readonly record struct UsuarioLogado(int Id, PapelEnum Papel, int GrupoEmpresaId);

    private UsuarioLogado? LerUsuario()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!int.TryParse(idClaim, out var usuarioId)) return null;

        var papelClaim = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("papel") ?? "CLIENTE";
        if (!Enum.TryParse<PapelEnum>(papelClaim, true, out var papel)) papel = PapelEnum.CLIENTE;

        var grupoClaim = User.FindFirstValue("GrupoEmpresaId") ?? User.FindFirstValue("grupo_empresa_id");
        var grupoId = int.TryParse(grupoClaim, out var g) ? g : 0;

        return new UsuarioLogado(usuarioId, papel, grupoId);
    }

    /// <summary>CLIENTE só acessa chamados do próprio grupo; papéis internos acessam tudo.</summary>
    private static bool PodeAcessar(UsuarioLogado usuario, Chamado chamado) =>
        PapeisInternos.Contains(usuario.Papel) || chamado.GrupoEmpresaId == usuario.GrupoEmpresaId;

    /// <summary>CLIENTE só vê interações PUBLICA.</summary>
    private IQueryable<Interacao> InteracoesVisiveis(int chamadoId, PapelEnum papel)
    {
        var query = _interacoes.ObterTodos().AsNoTracking().Where(i => i.ChamadoId == chamadoId);
        if (papel == PapelEnum.CLIENTE) query = query.Where(i => i.Tipo == TipoInteracaoEnum.PUBLICA);
        return query;
    }
}

/// <summary>Form multipart do upload: campo 'arquivos' (múltiplo) e 'mensagem' (opcional).</summary>
public class EnviarAnexosForm
{
    public List<IFormFile>? Arquivos { get; set; }
    public string? Mensagem { get; set; }
}
