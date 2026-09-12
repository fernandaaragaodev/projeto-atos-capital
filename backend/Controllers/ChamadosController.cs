using System.Security.Claims;
using backend.Data.Repositories;
using backend.DTOs;
using backend.Enums;
using backend.Events;
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
    private const string RolesEquipe = "AGENTE,SUPERVISOR,ADMIN,Agente,Supervisor,Admin";
    private const int PageSizePadrao = 20;
    private const int PageSizeMaximo = 100;

    private readonly IBaseRepository<Chamado> _chamados;
    private readonly IBaseRepository<Usuario> _usuarios;
    private readonly IBaseRepository<SLACategoria> _slaCategorias;
    private readonly IBaseRepository<Interacao> _interacoes;
    private readonly IBaseRepository<LogAuditoria> _logsAuditoria;
    private readonly IEventoService _eventos;

    public ChamadosController(IBaseRepository<Chamado> chamados, IBaseRepository<Usuario> usuarios,
        IBaseRepository<SLACategoria> slaCategorias, IBaseRepository<Interacao> interacoes,
        IBaseRepository<LogAuditoria> logsAuditoria, IEventoService eventos)
    {
        _chamados = chamados;
        _usuarios = usuarios;
        _slaCategorias = slaCategorias;
        _interacoes = interacoes;
        _logsAuditoria = logsAuditoria;
        _eventos = eventos;
    }

    // =====================================================================
    // Identidade / controle de acesso por papel (RF12)
    // =====================================================================

    /// <summary>Claims relevantes do JWT, lidas uma única vez por requisição.</summary>
    private sealed record UsuarioLogado(int Id, PapelEnum Papel, int GrupoEmpresaId)
    {
        public bool EhCliente => Papel == PapelEnum.CLIENTE;
        public bool EhAgente => Papel == PapelEnum.AGENTE;
        public bool EhSupervisorOuAdmin => Papel is PapelEnum.SUPERVISOR or PapelEnum.ADMIN;
        public bool EhEquipe => Papel is PapelEnum.AGENTE or PapelEnum.SUPERVISOR or PapelEnum.ADMIN;
    }

    /// <summary>
    /// Lê as claims do JWT de forma tolerante (padrão .NET e SSO Atos):
    /// Id = NameIdentifier | sub; Papel = Role | papel (default CLIENTE, o mais restritivo); Grupo = GrupoEmpresaId | grupo_empresa_id.
    /// Retorna null quando não há Id válido (token malformado).
    /// </summary>
    private UsuarioLogado? ObterUsuarioLogado()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(idClaim) || !int.TryParse(idClaim, out var id))
            return null;

        var papelClaim = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("papel") ?? string.Empty;
        if (!Enum.TryParse<PapelEnum>(papelClaim, true, out var papel))
            papel = PapelEnum.CLIENTE;

        var grupoClaim = User.FindFirstValue("GrupoEmpresaId") ?? User.FindFirstValue("grupo_empresa_id");
        var grupoEmpresaId = int.TryParse(grupoClaim, out var gId) ? gId : 0;

        return new UsuarioLogado(id, papel, grupoEmpresaId);
    }

    private IActionResult TokenInvalido() =>
        Unauthorized("A claim com o ID do usuário (NameIdentifier/sub) é obrigatória no JWT.");

    /// <summary>Cliente só enxerga chamados do próprio GrupoEmpresa; equipe enxerga todos.</summary>
    private static bool PodeVisualizar(UsuarioLogado usuario, int grupoEmpresaIdDoChamado) =>
        !usuario.EhCliente || usuario.GrupoEmpresaId == grupoEmpresaIdDoChamado;

    /// <summary>Agente só atua em chamados atribuídos a ele ou ainda sem agente.</summary>
    private static bool AgentePodeAtuar(UsuarioLogado usuario, int? agenteIdDoChamado) =>
        !usuario.EhAgente || agenteIdDoChamado == null || agenteIdDoChamado == usuario.Id;

    // =====================================================================
    // GET /api/Chamados — listagem com filtros e paginação (RF12-b)
    // =====================================================================

    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] StatusEnum? status,
        [FromQuery] PrioridadeEnum? prioridade,
        [FromQuery] int? agenteId,
        [FromQuery] string? busca,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageSizePadrao)
    {
        var usuario = ObterUsuarioLogado();
        if (usuario is null) return TokenInvalido();

        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = PageSizePadrao;
        if (pageSize > PageSizeMaximo) pageSize = PageSizeMaximo;

        IQueryable<Chamado> query = _chamados.ObterTodos().AsNoTracking();

        // Regras por papel
        if (usuario.EhCliente)
        {
            query = query.Where(c => c.GrupoEmpresaId == usuario.GrupoEmpresaId);
        }
        else if (usuario.EhAgente)
        {
            query = query.Where(c => c.AgenteId == null || c.AgenteId == usuario.Id);
        }

        // Filtros opcionais
        if (status.HasValue) query = query.Where(c => c.Status == status.Value);
        if (prioridade.HasValue) query = query.Where(c => c.Prioridade == prioridade.Value);
        if (agenteId.HasValue) query = query.Where(c => c.AgenteId == agenteId.Value);

        // Busca livre (case-insensitive) por código, usuário, empresa ou produto.
        // ToLower()+Contains() (em vez de EF.Functions.ILike, específico do Npgsql) traduz tanto
        // para PostgreSQL (produção) quanto para SQLite (ApiRegressionTests.cs).
        if (!string.IsNullOrWhiteSpace(busca))
        {
            var termo = busca.Trim().ToLower();
            query = query.Where(c =>
                c.CodigoPublico.ToLower().Contains(termo) ||
                c.Usuario.Nome.ToLower().Contains(termo) ||
                c.GrupoEmpresa.Nome.ToLower().Contains(termo) ||
                c.Produto.ToLower().Contains(termo));
        }

        var total = await query.CountAsync();
        var incluirNotasInternas = usuario.EhEquipe;
        var agora = DateTime.UtcNow;

        var itens = await query
            .OrderByDescending(c => c.CriadoEm)
            .ThenByDescending(c => c.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new
            {
                c.Id,
                c.CodigoPublico,
                c.Produto,
                c.Categoria,
                c.Descricao,
                c.Status,
                c.Prioridade,
                c.PrazoResposta,
                c.PrazoResolucao,
                c.CriadoEm,
                c.AguardandoDesde,
                c.ResolvidoEm,
                c.FechadoEm,
                c.UsuarioId,
                UsuarioNome = c.Usuario.Nome,
                c.GrupoEmpresaId,
                GrupoEmpresaNome = c.GrupoEmpresa.Nome,
                c.AgenteId,
                AgenteNome = c.Agente != null ? c.Agente.Nome : null,
                QuantidadeInteracoes = c.Interacoes.Count(i => incluirNotasInternas || i.Tipo == TipoInteracaoEnum.PUBLICA)
            })
            .ToListAsync();

        var dtos = itens.Select(c => new ChamadoResumoDto(
            c.Id, c.CodigoPublico, c.Produto, c.Categoria, c.Descricao, c.Status, c.Prioridade,
            c.PrazoResposta, c.PrazoResolucao, c.CriadoEm, c.AguardandoDesde, c.ResolvidoEm, c.FechadoEm,
            c.UsuarioId, c.UsuarioNome, c.GrupoEmpresaId, c.GrupoEmpresaNome, c.AgenteId, c.AgenteNome,
            c.QuantidadeInteracoes,
            Chamado.CalcularSlaEmRisco(c.Status, c.PrazoResolucao, agora),
            Chamado.CalcularSlaEstourado(c.Status, c.PrazoResolucao, agora)
        )).ToList();

        var totalPaginas = total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
        return Ok(new PaginaChamadosDto(dtos, page, pageSize, total, totalPaginas));
    }

    // =====================================================================
    // GET /api/Chamados/resumo — contadores para os cards do topo da fila (RF12)
    // =====================================================================

    [HttpGet("resumo")]
    public async Task<IActionResult> ObterResumo()
    {
        var usuario = ObterUsuarioLogado();
        if (usuario is null) return TokenInvalido();

        IQueryable<Chamado> query = _chamados.ObterTodos().AsNoTracking();

        // Mesmas regras de visibilidade do GET /api/Chamados
        if (usuario.EhCliente)
        {
            query = query.Where(c => c.GrupoEmpresaId == usuario.GrupoEmpresaId);
        }
        else if (usuario.EhAgente)
        {
            query = query.Where(c => c.AgenteId == null || c.AgenteId == usuario.Id);
        }

        var agora = DateTime.UtcNow;
        var limiteRisco = agora.AddHours(2);

        var total = await query.CountAsync();
        var emAberto = await query.CountAsync(c => c.Status == StatusEnum.ABERTO);
        var aguardandoCliente = await query.CountAsync(c => c.Status == StatusEnum.AGUARDANDO_CLIENTE);
        var comSlaEstourado = await query.CountAsync(c =>
            c.PrazoResolucao != null && c.Status != StatusEnum.RESOLVIDO && c.Status != StatusEnum.FECHADO &&
            c.PrazoResolucao.Value < agora);
        var comSlaPertoDeEstourar = await query.CountAsync(c =>
            c.PrazoResolucao != null && c.Status != StatusEnum.RESOLVIDO && c.Status != StatusEnum.FECHADO &&
            c.PrazoResolucao.Value >= agora && c.PrazoResolucao.Value <= limiteRisco);

        return Ok(new ResumoChamadosDto(total, emAberto, aguardandoCliente, comSlaEstourado, comSlaPertoDeEstourar));
    }

    [HttpGet("agentes-disponiveis")]
    [Authorize(Roles = RolesEquipe)]
    public async Task<IActionResult> ObterAgentesDisponiveis()
    {
        // Obtém os IDs dos agentes associados a chamados ATIVOS (sem data de resolução e sem data de fechamento)
        var agentesOcupadosIds = await _chamados.ObterTodos()
            .Where(c => c.AgenteId.HasValue && c.ResolvidoEm == null && c.FechadoEm == null)
            .Select(c => c.AgenteId!.Value)
            .Distinct()
            .ToListAsync();

        // Filtra os usuários com papel AGENTE que NÃO estão ocupados
        var agentesDisponiveis = await _usuarios.ObterTodos()
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

    [HttpGet("agentes")]
    [Authorize(Roles = RolesEquipe)]
    public async Task<IActionResult> ObterAgentes()
    {
        var agentes = await _usuarios.ObterTodos()
            .Where(u => u.Papel == PapelEnum.AGENTE)
            .OrderBy(u => u.Nome)
            .Select(u => new
            {
                u.Id,
                u.Nome,
                u.Email
            })
            .ToListAsync();

        return Ok(agentes);
    }

    // =====================================================================
    // GET /api/Chamados/{id} e /codigo/{codigoPublico} — detalhe + histórico (RF02)
    // =====================================================================

    [HttpGet("{id:int}")]
    public Task<IActionResult> ObterPorId(int id) =>
        ObterDetalhe(c => c.Id == id);

    [HttpGet("codigo/{codigoPublico}")]
    public Task<IActionResult> ObterPorCodigo(string codigoPublico) =>
        ObterDetalhe(c => c.CodigoPublico == codigoPublico);

    private async Task<IActionResult> ObterDetalhe(System.Linq.Expressions.Expression<Func<Chamado, bool>> filtro)
    {
        var usuario = ObterUsuarioLogado();
        if (usuario is null) return TokenInvalido();

        // Cliente não recebe NOTA_INTERNA (EhVisivelAoCliente) nem logs de auditoria
        var incluirNotasInternas = usuario.EhEquipe;
        var incluirLogs = usuario.EhEquipe;

        // Projeção única (AsNoTracking, sem ciclos, sem N+1)
        var c = await _chamados.ObterTodos()
            .AsNoTracking()
            .Where(filtro)
            .Select(c => new
            {
                c.Id,
                c.CodigoPublico,
                c.Produto,
                c.Categoria,
                c.Descricao,
                c.Status,
                c.Prioridade,
                c.PrazoResposta,
                c.PrazoResolucao,
                c.AguardandoDesde,
                c.CriadoEm,
                c.ResolvidoEm,
                c.FechadoEm,
                Usuario = new UsuarioChamadoDto(c.Usuario.Id, c.Usuario.Nome, c.Usuario.Email),
                Agente = c.Agente == null ? null : new AgenteChamadoDto(c.Agente.Id, c.Agente.Nome),
                GrupoEmpresa = new GrupoEmpresaChamadoDto(c.GrupoEmpresa.Id, c.GrupoEmpresa.Nome),
                SlaCategoria = c.SlaCategoria == null ? null : new SlaCategoriaChamadoDto(
                    c.SlaCategoria.Id, c.SlaCategoria.Produto, c.SlaCategoria.Categoria,
                    c.SlaCategoria.Prioridade, c.SlaCategoria.TempoResposta, c.SlaCategoria.TempoResolucao),
                Interacoes = c.Interacoes
                    .Where(i => incluirNotasInternas || i.Tipo == TipoInteracaoEnum.PUBLICA)
                    .OrderBy(i => i.CriadoEm).ThenBy(i => i.Id)
                    .Select(i => new InteracaoChamadoDto(
                        i.Id, i.ChamadoId,
                        new AutorInteracaoDto(i.Autor.Id, i.Autor.Nome, i.Autor.Papel),
                        i.Tipo, i.Mensagem, i.Anexos, i.CriadoEm))
                    .ToList(),
                LogsAuditoria = c.LogsAuditoria
                    .Where(l => incluirLogs)
                    .OrderBy(l => l.Data).ThenBy(l => l.Id)
                    .Select(l => new LogAuditoriaChamadoDto(
                        l.Id, l.Acao, l.CampoAlterado, l.ValorAnterior, l.ValorNovo, l.Usuario.Nome, l.Data))
                    .ToList()
            })
            .FirstOrDefaultAsync();

        if (c is null) return NotFound("Chamado não encontrado.");

        // 403 (e não 404): o recurso existe, mas o cliente é de outro grupo
        if (!PodeVisualizar(usuario, c.GrupoEmpresa.Id))
            return Forbid();

        var agora = DateTime.UtcNow;
        var dto = new ChamadoDetalheDto(
            c.Id, c.CodigoPublico, c.Produto, c.Categoria, c.Descricao, c.Status, c.Prioridade,
            c.PrazoResposta, c.PrazoResolucao, c.AguardandoDesde, c.CriadoEm, c.ResolvidoEm, c.FechadoEm,
            c.Usuario, c.Agente, c.GrupoEmpresa, c.SlaCategoria,
            Chamado.CalcularSlaEmRisco(c.Status, c.PrazoResolucao, agora),
            Chamado.CalcularSlaEstourado(c.Status, c.PrazoResolucao, agora),
            c.Interacoes,
            c.LogsAuditoria);

        return Ok(dto);
    }

    // =====================================================================
    // POST /api/Chamados — abertura (RF12-e: eventos)
    // =====================================================================

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] CriarChamadoDto dto)
    {
        var usuario = ObterUsuarioLogado();
        if (usuario is null) return TokenInvalido();

        if (usuario.GrupoEmpresaId <= 0)
            return BadRequest("A claim 'GrupoEmpresaId' (ou 'grupo_empresa_id') é obrigatória no JWT.");

        if (string.IsNullOrWhiteSpace(dto.Produto) || string.IsNullOrWhiteSpace(dto.Categoria) || string.IsNullOrWhiteSpace(dto.Descricao))
            return BadRequest("Produto, Categoria e Descricao são obrigatórios.");

        var chamado = new Chamado
        {
            Produto = dto.Produto.Trim(),
            Categoria = dto.Categoria.Trim(),
            Descricao = dto.Descricao.Trim(),
            Prioridade = dto.Prioridade,
            UsuarioId = usuario.Id,
            GrupoEmpresaId = usuario.GrupoEmpresaId,
            Status = StatusEnum.ABERTO,
            CriadoEm = DateTime.UtcNow
        };

        chamado.GerarCodigoPublico();

        // 1. Buscar Regra de SLA
        var slaRule = await _slaCategorias.ObterTodos()
            .FirstOrDefaultAsync(s => s.Produto == chamado.Produto && s.Categoria == chamado.Categoria && s.Prioridade == chamado.Prioridade);

        if (slaRule != null)
        {
            chamado.SlaCategoriaId = slaRule.Id;
            chamado.PrazoResposta = slaRule.CalcularPrazoResposta(chamado.CriadoEm);
            chamado.PrazoResolucao = slaRule.CalcularPrazoResolucao(chamado.CriadoEm);
        }

        // 2. ATRIBUIÇÃO AUTOMÁTICA: Buscar o primeiro agente livre
        var agentesOcupadosIds = await _chamados.ObterTodos()
            .Where(c => c.AgenteId.HasValue && c.ResolvidoEm == null && c.FechadoEm == null)
            .Select(c => c.AgenteId!.Value)
            .Distinct()
            .ToListAsync();

        var primeiroAgenteLivre = await _usuarios.ObterTodos()
            .Where(u => u.Papel == PapelEnum.AGENTE && !agentesOcupadosIds.Contains(u.Id))
            .OrderBy(u => u.Id)
            .FirstOrDefaultAsync();

        // Se encontrou agente livre, associa e atualiza o status para EM_ANDAMENTO
        if (primeiroAgenteLivre != null)
        {
            chamado.AtribuirAgente(primeiroAgenteLivre.Id);
        }

        _chamados.Add(chamado);

        // 3. Registrar Log de Auditoria
        _logsAuditoria.Add(new LogAuditoria
        {
            Chamado = chamado,
            UsuarioId = usuario.Id,
            Acao = "CRIAR_CHAMADO",
            CampoAlterado = "Status",
            ValorAnterior = "-",
            ValorNovo = chamado.Status.ToString(),
            Data = DateTime.UtcNow
        });

        // Se foi atribuído, registra o log de atribuição na mesma transação
        if (primeiroAgenteLivre != null)
        {
            _logsAuditoria.Add(new LogAuditoria
            {
                Chamado = chamado,
                UsuarioId = usuario.Id,
                Acao = "ATRIBUICAO_AUTOMATICA",
                CampoAlterado = "AgenteId",
                ValorAnterior = "Nenhum",
                ValorNovo = primeiroAgenteLivre.Id.ToString(),
                Data = DateTime.UtcNow
            });
        }

        await _chamados.SalvarAlteracoesAsync();

        // 4. Eventos (após persistir)
        await _eventos.PublicarAsync(TiposEvento.ChamadoCriado, chamado.Id, new
        {
            chamado.Id,
            chamado.CodigoPublico,
            chamado.Produto,
            chamado.Categoria,
            chamado.Prioridade,
            chamado.Status,
            chamado.UsuarioId,
            chamado.GrupoEmpresaId,
            chamado.AgenteId,
            chamado.PrazoResposta,
            chamado.PrazoResolucao,
            chamado.CriadoEm
        });

        if (primeiroAgenteLivre != null)
        {
            await _eventos.PublicarAsync(TiposEvento.ChamadoAgenteAtribuido, chamado.Id, new
            {
                ChamadoId = chamado.Id,
                chamado.CodigoPublico,
                AgenteId = primeiroAgenteLivre.Id,
                AgenteNome = primeiroAgenteLivre.Nome,
                AgenteAnteriorId = (int?)null,
                AtribuidoPorId = usuario.Id,
                Automatico = true,
                chamado.Status,
                DataHora = DateTime.UtcNow
            });
        }

        return CreatedAtAction(nameof(ObterPorId), new { id = chamado.Id }, MapearResposta(chamado));
    }

    // =====================================================================
    // PATCH /api/Chamados/{id}/status — alterar status (RF04)
    // =====================================================================

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> AlterarStatus(int id, [FromBody] AlterarStatusChamadoDto dto)
    {
        var usuario = ObterUsuarioLogado();
        if (usuario is null) return TokenInvalido();

        if (!Enum.IsDefined(dto.Status))
            return BadRequest("Status inválido.");

        var chamado = await _chamados.ObterAsync(id);
        if (chamado == null) return NotFound("Chamado não encontrado.");

        // Visibilidade: cliente só no próprio grupo
        if (!PodeVisualizar(usuario, chamado.GrupoEmpresaId))
            return Forbid();

        // Agente só atua em chamados dele ou sem agente
        if (!AgentePodeAtuar(usuario, chamado.AgenteId))
            return Forbid();

        var statusAnterior = chamado.Status;
        var novoStatus = dto.Status;

        if (statusAnterior == StatusEnum.FECHADO)
            return Conflict("Chamado FECHADO é terminal e não pode ter o status alterado.");

        if (novoStatus == statusAnterior)
            return Conflict($"O chamado já está no status {statusAnterior}.");

        if (!Chamado.TransicaoPermitida(statusAnterior, novoStatus))
            return Conflict($"Transição de {statusAnterior} para {novoStatus} não é permitida.");

        // Cliente: só confirmar fechamento (RESOLVIDO->FECHADO) ou responder (AGUARDANDO_CLIENTE->EM_ANDAMENTO)
        if (usuario.EhCliente)
        {
            var permitidoAoCliente =
                (statusAnterior == StatusEnum.RESOLVIDO && novoStatus == StatusEnum.FECHADO) ||
                (statusAnterior == StatusEnum.AGUARDANDO_CLIENTE && novoStatus == StatusEnum.EM_ANDAMENTO);

            if (!permitidoAoCliente)
                return Forbid();
        }

        chamado.AlterarStatus(novoStatus);

        var agora = DateTime.UtcNow;

        _logsAuditoria.Add(new LogAuditoria
        {
            ChamadoId = chamado.Id,
            UsuarioId = usuario.Id,
            Acao = "ALTERAR_STATUS",
            CampoAlterado = "Status",
            ValorAnterior = statusAnterior.ToString(),
            ValorNovo = novoStatus.ToString(),
            Data = agora
        });

        Interacao? comentario = null;
        if (!string.IsNullOrWhiteSpace(dto.Comentario))
        {
            comentario = new Interacao
            {
                ChamadoId = chamado.Id,
                AutorId = usuario.Id,
                Tipo = TipoInteracaoEnum.PUBLICA,
                Mensagem = dto.Comentario.Trim(),
                CriadoEm = agora
            };
            _interacoes.Add(comentario);
        }

        await _chamados.SalvarAlteracoesAsync();

        // Eventos (após persistir)
        var payloadStatus = new
        {
            ChamadoId = chamado.Id,
            chamado.CodigoPublico,
            StatusAnterior = statusAnterior,
            Status = novoStatus,
            AlteradoPorId = usuario.Id,
            AlteradoPorPapel = usuario.Papel,
            chamado.AgenteId,
            chamado.UsuarioId,
            chamado.GrupoEmpresaId,
            chamado.Prioridade,
            Comentario = comentario?.Mensagem,
            chamado.AguardandoDesde,
            chamado.ResolvidoEm,
            chamado.FechadoEm,
            DataHora = agora
        };

        await _eventos.PublicarAsync(TiposEvento.ChamadoStatusAlterado, chamado.Id, payloadStatus);

        if (novoStatus == StatusEnum.RESOLVIDO)
            await _eventos.PublicarAsync(TiposEvento.ChamadoResolvido, chamado.Id, payloadStatus);
        else if (novoStatus == StatusEnum.FECHADO)
            await _eventos.PublicarAsync(TiposEvento.ChamadoFechado, chamado.Id, payloadStatus);

        if (comentario != null)
            await PublicarInteracaoCriada(chamado, comentario, usuario);

        return Ok(MapearResposta(chamado));
    }

    // =====================================================================
    // PATCH /api/Chamados/{id}/atribuir — atribuição de agente (RF12-c)
    // =====================================================================

    [HttpPatch("{id:int}/atribuir")]
    [Authorize(Roles = RolesEquipe)]
    public async Task<IActionResult> AtribuirAgente(int id, [FromBody] int agenteId)
    {
        var usuario = ObterUsuarioLogado();
        if (usuario is null) return TokenInvalido();

        // AGENTE só pode atribuir a si mesmo; SUPERVISOR/ADMIN a qualquer agente
        if (usuario.EhAgente && agenteId != usuario.Id)
            return Forbid();

        var chamado = await _chamados.ObterAsync(id);
        if (chamado == null) return NotFound("Chamado não encontrado.");

        if (chamado.Status == StatusEnum.FECHADO)
            return Conflict("Chamado FECHADO é terminal e não pode ser atribuído.");

        // Agente só assume chamado sem agente ou que já é dele
        if (!AgentePodeAtuar(usuario, chamado.AgenteId))
            return Forbid();

        var agente = await _usuarios.ObterTodos()
            .AsNoTracking()
            .Where(u => u.Id == agenteId && u.Papel == PapelEnum.AGENTE)
            .Select(u => new { u.Id, u.Nome })
            .FirstOrDefaultAsync();

        if (agente == null) return BadRequest($"Agente com ID {agenteId} inválido ou não encontrado.");

        var agenteAnteriorId = chamado.AgenteId;
        var statusAnterior = chamado.Status;
        var agora = DateTime.UtcNow;

        chamado.AtribuirAgente(agenteId);

        _logsAuditoria.Add(new LogAuditoria
        {
            ChamadoId = chamado.Id,
            UsuarioId = usuario.Id,
            Acao = "ATRIBUIR_AGENTE",
            CampoAlterado = "AgenteId",
            ValorAnterior = agenteAnteriorId?.ToString() ?? "Nenhum",
            ValorNovo = agenteId.ToString(),
            Data = agora
        });

        // AtribuirAgente também muda o status para EM_ANDAMENTO — auditamos quando isso de fato ocorre
        var statusMudou = chamado.Status != statusAnterior;
        if (statusMudou)
        {
            _logsAuditoria.Add(new LogAuditoria
            {
                ChamadoId = chamado.Id,
                UsuarioId = usuario.Id,
                Acao = "ALTERAR_STATUS",
                CampoAlterado = "Status",
                ValorAnterior = statusAnterior.ToString(),
                ValorNovo = chamado.Status.ToString(),
                Data = agora
            });
        }

        await _chamados.SalvarAlteracoesAsync();

        await _eventos.PublicarAsync(TiposEvento.ChamadoAgenteAtribuido, chamado.Id, new
        {
            ChamadoId = chamado.Id,
            chamado.CodigoPublico,
            AgenteId = agente.Id,
            AgenteNome = agente.Nome,
            AgenteAnteriorId = agenteAnteriorId,
            AtribuidoPorId = usuario.Id,
            Automatico = false,
            chamado.Status,
            DataHora = agora
        });

        if (statusMudou)
        {
            await _eventos.PublicarAsync(TiposEvento.ChamadoStatusAlterado, chamado.Id, new
            {
                ChamadoId = chamado.Id,
                chamado.CodigoPublico,
                StatusAnterior = statusAnterior,
                chamado.Status,
                AlteradoPorId = usuario.Id,
                AlteradoPorPapel = usuario.Papel,
                chamado.AgenteId,
                chamado.UsuarioId,
                chamado.GrupoEmpresaId,
                chamado.Prioridade,
                Comentario = (string?)null,
                chamado.AguardandoDesde,
                chamado.ResolvidoEm,
                chamado.FechadoEm,
                DataHora = agora
            });
        }

        return Ok(MapearResposta(chamado));
    }

    // =====================================================================
    // POST /api/Chamados/{id}/interacoes — interações (RF12-d)
    // =====================================================================

    [HttpPost("{id:int}/interacoes")]
    public async Task<IActionResult> AdicionarInteracao(int id, [FromBody] CriarInteracaoDto dto)
    {
        var usuario = ObterUsuarioLogado();
        if (usuario is null) return TokenInvalido();

        if (string.IsNullOrWhiteSpace(dto.Mensagem))
            return BadRequest("Mensagem é obrigatória.");

        if (!Enum.IsDefined(dto.Tipo))
            return BadRequest("Tipo de interação inválido.");

        // Segurança: o campo Anexos NUNCA é aceito do cliente. Ele é preenchido apenas pelo servidor
        // (AnexosController, após validar e gravar o arquivo). Aceitar JSON arbitrário aqui permitiria
        // referenciar um NomeArmazenado de outro chamado e baixá-lo por /api/Chamados/{id}/anexos/{nome}.
        if (!string.IsNullOrWhiteSpace(dto.Anexos))
            return BadRequest("Anexos não podem ser informados neste endpoint. Use POST /api/Chamados/{id}/anexos (multipart/form-data).");

        var chamado = await _chamados.ObterAsync(id);
        if (chamado == null) return NotFound("Chamado não encontrado.");

        // Cliente: só no próprio grupo e só PUBLICA
        if (!PodeVisualizar(usuario, chamado.GrupoEmpresaId))
            return Forbid();

        if (usuario.EhCliente && dto.Tipo == TipoInteracaoEnum.NOTA_INTERNA)
            return Forbid();

        // Agente só interage em chamados dele ou sem agente
        if (!AgentePodeAtuar(usuario, chamado.AgenteId))
            return Forbid();

        if (chamado.Status == StatusEnum.FECHADO)
            return Conflict("Chamado FECHADO é terminal e não aceita novas interações.");

        var agora = DateTime.UtcNow;

        var interacao = new Interacao
        {
            ChamadoId = chamado.Id,
            AutorId = usuario.Id,
            Mensagem = dto.Mensagem.Trim(),
            Tipo = dto.Tipo,
            Anexos = null, // só o AnexosController grava anexos
            CriadoEm = agora
        };

        _interacoes.Add(interacao);

        // Controle de AguardandoDesde / status:
        // - Equipe responde publicamente em chamado ABERTO/EM_ANDAMENTO -> passa a AGUARDANDO_CLIENTE (seta AguardandoDesde)
        // - Cliente responde em chamado AGUARDANDO_CLIENTE -> volta a EM_ANDAMENTO (limpa AguardandoDesde)
        // - NOTA_INTERNA nunca altera status
        var statusAnterior = chamado.Status;
        if (dto.Tipo == TipoInteracaoEnum.PUBLICA)
        {
            if (usuario.EhEquipe && chamado.Status is StatusEnum.ABERTO or StatusEnum.EM_ANDAMENTO)
            {
                chamado.AlterarStatus(StatusEnum.AGUARDANDO_CLIENTE);
            }
            else if (usuario.EhCliente && chamado.Status == StatusEnum.AGUARDANDO_CLIENTE)
            {
                chamado.AlterarStatus(StatusEnum.EM_ANDAMENTO);
            }
        }

        var statusMudou = chamado.Status != statusAnterior;
        if (statusMudou)
        {
            _logsAuditoria.Add(new LogAuditoria
            {
                ChamadoId = chamado.Id,
                UsuarioId = usuario.Id,
                Acao = "ALTERAR_STATUS",
                CampoAlterado = "Status",
                ValorAnterior = statusAnterior.ToString(),
                ValorNovo = chamado.Status.ToString(),
                Data = agora
            });
        }

        await _chamados.SalvarAlteracoesAsync();

        await PublicarInteracaoCriada(chamado, interacao, usuario);

        if (statusMudou)
        {
            await _eventos.PublicarAsync(TiposEvento.ChamadoStatusAlterado, chamado.Id, new
            {
                ChamadoId = chamado.Id,
                chamado.CodigoPublico,
                StatusAnterior = statusAnterior,
                chamado.Status,
                AlteradoPorId = usuario.Id,
                AlteradoPorPapel = usuario.Papel,
                chamado.AgenteId,
                chamado.UsuarioId,
                chamado.GrupoEmpresaId,
                chamado.Prioridade,
                Comentario = (string?)null,
                chamado.AguardandoDesde,
                chamado.ResolvidoEm,
                chamado.FechadoEm,
                DataHora = agora
            });
        }

        var autorNome = await _usuarios.ObterTodos()
            .AsNoTracking()
            .Where(u => u.Id == usuario.Id)
            .Select(u => u.Nome)
            .FirstOrDefaultAsync() ?? string.Empty;

        var resposta = new InteracaoChamadoDto(
            interacao.Id,
            interacao.ChamadoId,
            new AutorInteracaoDto(usuario.Id, autorNome, usuario.Papel),
            interacao.Tipo,
            interacao.Mensagem,
            interacao.Anexos,
            interacao.CriadoEm);

        return Ok(resposta);
    }

    // =====================================================================
    // Auxiliares
    // =====================================================================

    private Task PublicarInteracaoCriada(Chamado chamado, Interacao interacao, UsuarioLogado autor) =>
        _eventos.PublicarAsync(TiposEvento.InteracaoCriada, chamado.Id, new
        {
            ChamadoId = chamado.Id,
            chamado.CodigoPublico,
            InteracaoId = interacao.Id,
            AutorId = autor.Id,
            AutorPapel = autor.Papel,
            interacao.Tipo,
            // Conteúdo de NOTA_INTERNA não sai no payload (pode ir para webhooks externos)
            Mensagem = interacao.Tipo == TipoInteracaoEnum.PUBLICA ? interacao.Mensagem : null,
            interacao.Anexos,
            chamado.Status,
            chamado.UsuarioId,
            chamado.AgenteId,
            chamado.GrupoEmpresaId,
            interacao.CriadoEm
        });

    private static RespostaChamadoDto MapearResposta(Chamado c) => new(
        c.Id,
        c.CodigoPublico,
        c.Produto,
        c.Categoria,
        c.Descricao,
        c.Status,
        c.Prioridade,
        c.PrazoResposta,
        c.PrazoResolucao,
        c.CriadoEm,
        c.UsuarioId,
        c.GrupoEmpresaId,
        c.AgenteId,
        c.SlaCategoriaId,
        c.AguardandoDesde,
        c.ResolvidoEm,
        c.FechadoEm);
}
