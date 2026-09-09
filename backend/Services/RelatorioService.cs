using backend.Data;
using backend.DTOs;
using backend.Enums;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>
/// RF08 — Relatórios gerenciais (SUPERVISOR/ADMIN) e consultas de SLA/alertas (RF07/RF09).
///
/// Estratégia de consulta: agregações simples (contagens por status/produto/grupo/categoria/prioridade)
/// são feitas no banco via GroupBy traduzido pelo Npgsql. Métricas que envolvem diferença de datas
/// (tempos médios, % dentro do SLA, série temporal) são calculadas em memória sobre uma projeção
/// enxuta (<see cref="ChamadoMetrica"/>) do conjunto já filtrado — o EF/Npgsql não traduz
/// TimeSpan.TotalHours nem date_trunc de forma portável, e o volume filtrado é pequeno.
/// </summary>
public class RelatorioService
{
    private readonly AppDbContext _context;

    public RelatorioService(AppDbContext context)
    {
        _context = context;
    }

    // ---------------------------------------------------------------------------------------------
    // Filtros comuns
    // ---------------------------------------------------------------------------------------------

    /// <summary>Filtro já normalizado: datas em UTC e fim exclusivo.</summary>
    private sealed record FiltroNormalizado(DateTime? Inicio, DateTime? FimExclusivo, int? GrupoEmpresaId, int? AgenteId, string? Produto);

    private static DateTime ParaUtc(DateTime d) => d.Kind switch
    {
        DateTimeKind.Utc => d,
        DateTimeKind.Local => d.ToUniversalTime(),
        _ => DateTime.SpecifyKind(d, DateTimeKind.Utc)
    };

    private static FiltroNormalizado Normalizar(FiltroRelatorioDto? f)
    {
        f ??= new FiltroRelatorioDto();
        DateTime? inicio = f.DataInicio.HasValue ? ParaUtc(f.DataInicio.Value) : null;
        DateTime? fim = null;
        if (f.DataFim.HasValue)
        {
            var d = ParaUtc(f.DataFim.Value);
            // Data sem hora => inclui o dia inteiro
            fim = d.TimeOfDay == TimeSpan.Zero ? d.AddDays(1) : d;
        }
        var produto = string.IsNullOrWhiteSpace(f.Produto) ? null : f.Produto.Trim();
        return new FiltroNormalizado(inicio, fim, f.GrupoEmpresaId, f.AgenteId, produto);
    }

    /// <summary>Valida o filtro; retorna mensagem de erro ou null se válido.</summary>
    public static string? ValidarFiltro(FiltroRelatorioDto? f)
    {
        if (f == null) return null;
        if (f.DataInicio.HasValue && f.DataFim.HasValue && ParaUtc(f.DataFim.Value) < ParaUtc(f.DataInicio.Value))
            return "dataFim não pode ser anterior a dataInicio.";
        if (f.GrupoEmpresaId is <= 0) return "grupoEmpresaId inválido.";
        if (f.AgenteId is <= 0) return "agenteId inválido.";
        if (f.Produto is { Length: > 200 }) return "produto excede 200 caracteres.";
        return null;
    }

    private IQueryable<Chamado> Consulta(FiltroNormalizado f)
    {
        IQueryable<Chamado> q = _context.Chamados.AsNoTracking();
        if (f.Inicio.HasValue) q = q.Where(c => c.CriadoEm >= f.Inicio.Value);
        if (f.FimExclusivo.HasValue) q = q.Where(c => c.CriadoEm < f.FimExclusivo.Value);
        if (f.GrupoEmpresaId.HasValue) q = q.Where(c => c.GrupoEmpresaId == f.GrupoEmpresaId.Value);
        if (f.AgenteId.HasValue) q = q.Where(c => c.AgenteId == f.AgenteId.Value);
        if (f.Produto != null) q = q.Where(c => c.Produto.ToLower() == f.Produto.ToLower());
        return q;
    }

    private static bool Finalizado(StatusEnum s) => s == StatusEnum.RESOLVIDO || s == StatusEnum.FECHADO;

    // ---------------------------------------------------------------------------------------------
    // Projeção enxuta para cálculos em memória
    // ---------------------------------------------------------------------------------------------

    private sealed record ChamadoMetrica(
        int Id,
        StatusEnum Status,
        PrioridadeEnum Prioridade,
        string Produto,
        string Categoria,
        int? AgenteId,
        string? AgenteNome,
        DateTime CriadoEm,
        DateTime? ResolvidoEm,
        DateTime? PrazoResposta,
        DateTime? PrazoResolucao,
        DateTime? PrimeiraRespostaEm)
    {
        public bool EstaFinalizado => Finalizado(Status);
        public DateTime? ConclusaoEfetiva => ResolvidoEm;

        /// <summary>true = cumprido, false = violado, null = ainda pendente (não avaliável).</summary>
        public bool? SlaResolucaoCumprido(DateTime agora)
        {
            if (!PrazoResolucao.HasValue) return null;
            if (ConclusaoEfetiva.HasValue) return ConclusaoEfetiva.Value <= PrazoResolucao.Value;
            if (EstaFinalizado) return null; // finalizado sem data de resolução: não avaliável
            return PrazoResolucao.Value < agora ? false : null;
        }

        public bool? SlaRespostaCumprido(DateTime agora)
        {
            if (!PrazoResposta.HasValue) return null;
            if (PrimeiraRespostaEm.HasValue) return PrimeiraRespostaEm.Value <= PrazoResposta.Value;
            if (EstaFinalizado) return null; // resolvido sem interação de agente registrada: não avaliável
            return PrazoResposta.Value < agora ? false : null;
        }

        public double? HorasAteResolucao => ResolvidoEm.HasValue ? (ResolvidoEm.Value - CriadoEm).TotalHours : null;
        public double? HorasAtePrimeiraResposta => PrimeiraRespostaEm.HasValue ? (PrimeiraRespostaEm.Value - CriadoEm).TotalHours : null;
    }

    private Task<List<ChamadoMetrica>> CarregarMetricasAsync(FiltroNormalizado f, CancellationToken ct)
    {
        // A "primeira resposta" é a primeira interação cujo autor não é CLIENTE (AGENTE/SUPERVISOR/ADMIN),
        // calculada como subquery Min() traduzida pelo Npgsql.
        return Consulta(f)
            .Select(c => new ChamadoMetrica(
                c.Id,
                c.Status,
                c.Prioridade,
                c.Produto,
                c.Categoria,
                c.AgenteId,
                c.Agente != null ? c.Agente.Nome : null,
                c.CriadoEm,
                c.ResolvidoEm,
                c.PrazoResposta,
                c.PrazoResolucao,
                c.Interacoes
                    .Where(i => i.Autor.Papel != PapelEnum.CLIENTE)
                    .Min(i => (DateTime?)i.CriadoEm)))
            .ToListAsync(ct);
    }

    private static double? Media(IEnumerable<double?> valores)
    {
        var lista = valores.Where(v => v.HasValue).Select(v => v!.Value).ToList();
        return lista.Count == 0 ? null : Math.Round(lista.Average(), 2);
    }

    private static double? Percentual(int parte, int total) =>
        total == 0 ? null : Math.Round(parte * 100.0 / total, 2);

    // ---------------------------------------------------------------------------------------------
    // RF08 — Resumo
    // ---------------------------------------------------------------------------------------------

    public async Task<ResumoRelatorioDto> GerarResumoAsync(FiltroRelatorioDto? filtro, CancellationToken ct = default)
    {
        var f = Normalizar(filtro);
        var agora = DateTime.UtcNow;
        var hoje = agora.Date;

        var porStatus = await Consulta(f)
            .GroupBy(c => c.Status)
            .Select(g => new { Status = g.Key, Total = g.Count() })
            .ToListAsync(ct);

        var totaisPorStatus = Enum.GetValues<StatusEnum>()
            .Select(s => new TotalPorStatusDto(s, s.ToString(), porStatus.FirstOrDefault(x => x.Status == s)?.Total ?? 0))
            .ToList();

        var abertosHoje = await Consulta(f).CountAsync(c => c.CriadoEm >= hoje, ct);

        // "Resolvidos no período" considera a data de RESOLUÇÃO dentro do período (independente da data de abertura)
        var resolvidosQuery = ConsultaSemPeriodo(f).Where(c => c.ResolvidoEm != null);
        if (f.Inicio.HasValue) resolvidosQuery = resolvidosQuery.Where(c => c.ResolvidoEm >= f.Inicio.Value);
        if (f.FimExclusivo.HasValue) resolvidosQuery = resolvidosQuery.Where(c => c.ResolvidoEm < f.FimExclusivo.Value);
        var resolvidosNoPeriodo = await resolvidosQuery.CountAsync(ct);

        var metricas = await CarregarMetricasAsync(f, ct);

        var slaResolucao = metricas.Select(m => m.SlaResolucaoCumprido(agora)).Where(v => v.HasValue).Select(v => v!.Value).ToList();
        var slaResposta = metricas.Select(m => m.SlaRespostaCumprido(agora)).Where(v => v.HasValue).Select(v => v!.Value).ToList();

        return new ResumoRelatorioDto(
            TotalChamados: metricas.Count,
            TotaisPorStatus: totaisPorStatus,
            AbertosHoje: abertosHoje,
            ResolvidosNoPeriodo: resolvidosNoPeriodo,
            EmAbertoNoMomento: metricas.Count(m => !m.EstaFinalizado),
            TempoMedioPrimeiraRespostaHoras: Media(metricas.Select(m => m.HorasAtePrimeiraResposta)),
            TempoMedioResolucaoHoras: Media(metricas.Select(m => m.HorasAteResolucao)),
            ChamadosComSlaResolucaoAvaliados: slaResolucao.Count,
            PercentualDentroSlaResolucao: Percentual(slaResolucao.Count(v => v), slaResolucao.Count),
            ChamadosComSlaRespostaAvaliados: slaResposta.Count,
            PercentualDentroSlaResposta: Percentual(slaResposta.Count(v => v), slaResposta.Count));
    }

    /// <summary>Mesmos filtros de grupo/agente/produto, sem o recorte por CriadoEm.</summary>
    private IQueryable<Chamado> ConsultaSemPeriodo(FiltroNormalizado f) =>
        Consulta(f with { Inicio = null, FimExclusivo = null });

    // ---------------------------------------------------------------------------------------------
    // RF08 — Por agente
    // ---------------------------------------------------------------------------------------------

    public async Task<List<RelatorioPorAgenteDto>> GerarPorAgenteAsync(FiltroRelatorioDto? filtro, CancellationToken ct = default)
    {
        var f = Normalizar(filtro);
        var agora = DateTime.UtcNow;

        // Todos os agentes cadastrados aparecem (mesmo com zero chamados), além de qualquer usuário que tenha chamado atribuído
        var agentesQuery = _context.Usuarios.AsNoTracking().Where(u => u.Papel == PapelEnum.AGENTE);
        if (f.AgenteId.HasValue) agentesQuery = agentesQuery.Where(u => u.Id == f.AgenteId.Value);
        var agentes = await agentesQuery.Select(u => new { u.Id, u.Nome }).ToListAsync(ct);

        var metricas = (await CarregarMetricasAsync(f, ct)).Where(m => m.AgenteId.HasValue).ToList();

        var porAgente = metricas.GroupBy(m => m.AgenteId!.Value).ToDictionary(g => g.Key, g => g.ToList());
        var nomes = agentes.ToDictionary(a => a.Id, a => a.Nome);
        foreach (var g in porAgente)
            nomes.TryAdd(g.Key, g.Value.First().AgenteNome ?? $"Usuário {g.Key}");

        return nomes
            .OrderBy(n => n.Value)
            .Select(n =>
            {
                var lista = porAgente.TryGetValue(n.Key, out var l) ? l : new List<ChamadoMetrica>();
                var sla = lista.Select(m => m.SlaResolucaoCumprido(agora)).Where(v => v.HasValue).Select(v => v!.Value).ToList();
                return new RelatorioPorAgenteDto(
                    AgenteId: n.Key,
                    AgenteNome: n.Value,
                    ChamadosAtribuidos: lista.Count,
                    Resolvidos: lista.Count(m => m.EstaFinalizado),
                    AbertosNoMomento: lista.Count(m => !m.EstaFinalizado),
                    TempoMedioResolucaoHoras: Media(lista.Select(m => m.HorasAteResolucao)),
                    ChamadosComSlaAvaliados: sla.Count,
                    PercentualSlaCumprido: Percentual(sla.Count(v => v), sla.Count));
            })
            .ToList();
    }

    // ---------------------------------------------------------------------------------------------
    // RF08 — Agrupamentos simples (traduzidos pelo Npgsql)
    // ---------------------------------------------------------------------------------------------

    public async Task<List<TotalPorStatusDto>> GerarPorStatusAsync(FiltroRelatorioDto? filtro, CancellationToken ct = default)
    {
        var f = Normalizar(filtro);
        var grupos = await Consulta(f)
            .GroupBy(c => c.Status)
            .Select(g => new { Status = g.Key, Total = g.Count() })
            .ToListAsync(ct);

        return Enum.GetValues<StatusEnum>()
            .Select(s => new TotalPorStatusDto(s, s.ToString(), grupos.FirstOrDefault(g => g.Status == s)?.Total ?? 0))
            .ToList();
    }

    public async Task<List<TotalPorPrioridadeDto>> GerarPorPrioridadeAsync(FiltroRelatorioDto? filtro, CancellationToken ct = default)
    {
        var f = Normalizar(filtro);
        var grupos = await Consulta(f)
            .GroupBy(c => c.Prioridade)
            .Select(g => new { Prioridade = g.Key, Total = g.Count() })
            .ToListAsync(ct);

        return Enum.GetValues<PrioridadeEnum>()
            .OrderByDescending(p => p)
            .Select(p => new TotalPorPrioridadeDto(p, p.ToString(), grupos.FirstOrDefault(g => g.Prioridade == p)?.Total ?? 0))
            .ToList();
    }

    // Observação: nos três agrupamentos abaixo a agregação (GroupBy + Count condicional) roda no banco em tipo
    // anônimo e o mapeamento para o record tipado é feito em memória — o EF Core não traduz Count(predicado)
    // dentro de construtor de record na projeção de GroupBy.

    public async Task<List<TotalPorProdutoDto>> GerarPorProdutoAsync(FiltroRelatorioDto? filtro, CancellationToken ct = default)
    {
        var f = Normalizar(filtro);
        var grupos = await Consulta(f)
            .GroupBy(c => c.Produto)
            .Select(g => new
            {
                Produto = g.Key,
                Total = g.Count(),
                Abertos = g.Count(c => c.Status == StatusEnum.ABERTO),
                EmAndamento = g.Count(c => c.Status == StatusEnum.EM_ANDAMENTO),
                AguardandoCliente = g.Count(c => c.Status == StatusEnum.AGUARDANDO_CLIENTE),
                Resolvidos = g.Count(c => c.Status == StatusEnum.RESOLVIDO),
                Fechados = g.Count(c => c.Status == StatusEnum.FECHADO)
            })
            .OrderBy(x => x.Produto)
            .ToListAsync(ct);

        return grupos
            .Select(x => new TotalPorProdutoDto(x.Produto, x.Total, x.Abertos, x.EmAndamento, x.AguardandoCliente, x.Resolvidos, x.Fechados))
            .ToList();
    }

    public async Task<List<TotalPorGrupoEmpresaDto>> GerarPorGrupoEmpresaAsync(FiltroRelatorioDto? filtro, CancellationToken ct = default)
    {
        var f = Normalizar(filtro);
        var grupos = await Consulta(f)
            .GroupBy(c => new { c.GrupoEmpresaId, c.GrupoEmpresa.Nome })
            .Select(g => new
            {
                g.Key.GrupoEmpresaId,
                g.Key.Nome,
                Total = g.Count(),
                EmAberto = g.Count(c => c.Status != StatusEnum.RESOLVIDO && c.Status != StatusEnum.FECHADO),
                Finalizados = g.Count(c => c.Status == StatusEnum.RESOLVIDO || c.Status == StatusEnum.FECHADO)
            })
            .OrderBy(x => x.Nome)
            .ToListAsync(ct);

        return grupos
            .Select(x => new TotalPorGrupoEmpresaDto(x.GrupoEmpresaId, x.Nome, x.Total, x.EmAberto, x.Finalizados))
            .ToList();
    }

    public async Task<List<TotalPorCategoriaDto>> GerarPorCategoriaAsync(FiltroRelatorioDto? filtro, CancellationToken ct = default)
    {
        var f = Normalizar(filtro);
        var grupos = await Consulta(f)
            .GroupBy(c => c.Categoria)
            .Select(g => new
            {
                Categoria = g.Key,
                Total = g.Count(),
                EmAberto = g.Count(c => c.Status != StatusEnum.RESOLVIDO && c.Status != StatusEnum.FECHADO),
                Finalizados = g.Count(c => c.Status == StatusEnum.RESOLVIDO || c.Status == StatusEnum.FECHADO)
            })
            .OrderBy(x => x.Categoria)
            .ToListAsync(ct);

        return grupos
            .Select(x => new TotalPorCategoriaDto(x.Categoria, x.Total, x.EmAberto, x.Finalizados))
            .ToList();
    }

    // ---------------------------------------------------------------------------------------------
    // RF08 — Evolução (série temporal abertos x resolvidos)
    // ---------------------------------------------------------------------------------------------

    public static readonly string[] GranularidadesValidas = ["dia", "semana", "mes"];

    public async Task<EvolucaoRelatorioDto> GerarEvolucaoAsync(FiltroRelatorioDto? filtro, string granularidade, CancellationToken ct = default)
    {
        granularidade = (granularidade ?? "dia").Trim().ToLowerInvariant();
        if (!GranularidadesValidas.Contains(granularidade))
            throw new ArgumentException("granularidade deve ser dia, semana ou mes.");

        var f = Normalizar(filtro);
        var agora = DateTime.UtcNow;

        // Abertos: por data de criação dentro do período. Resolvidos: por data de resolução dentro do período.
        var abertos = await Consulta(f).Select(c => c.CriadoEm).ToListAsync(ct);

        var resolvidosQuery = ConsultaSemPeriodo(f).Where(c => c.ResolvidoEm != null);
        if (f.Inicio.HasValue) resolvidosQuery = resolvidosQuery.Where(c => c.ResolvidoEm >= f.Inicio.Value);
        if (f.FimExclusivo.HasValue) resolvidosQuery = resolvidosQuery.Where(c => c.ResolvidoEm < f.FimExclusivo.Value);
        var resolvidos = await resolvidosQuery.Select(c => c.ResolvidoEm!.Value).ToListAsync(ct);

        // Período efetivo: filtro informado, senão do dado mais antigo até agora (default: últimos 30 dias se não há dados)
        var todasDatas = abertos.Concat(resolvidos).ToList();
        var inicio = f.Inicio ?? (todasDatas.Count > 0 ? todasDatas.Min() : agora.AddDays(-30));
        var fim = f.FimExclusivo.HasValue ? f.FimExclusivo.Value.AddTicks(-1) : agora;
        if (fim < inicio) fim = inicio;

        var abertosPorBucket = abertos.GroupBy(d => Truncar(d, granularidade)).ToDictionary(g => g.Key, g => g.Count());
        var resolvidosPorBucket = resolvidos.GroupBy(d => Truncar(d, granularidade)).ToDictionary(g => g.Key, g => g.Count());

        var serie = new List<PontoEvolucaoDto>();
        for (var b = Truncar(inicio, granularidade); b <= fim; b = Avancar(b, granularidade))
        {
            serie.Add(new PontoEvolucaoDto(
                b,
                Rotulo(b, granularidade),
                abertosPorBucket.GetValueOrDefault(b),
                resolvidosPorBucket.GetValueOrDefault(b)));
        }

        return new EvolucaoRelatorioDto(granularidade, Truncar(inicio, granularidade), fim, serie);
    }

    private static DateTime Truncar(DateTime d, string g)
    {
        d = DateTime.SpecifyKind(d.Date, DateTimeKind.Utc);
        return g switch
        {
            "semana" => d.AddDays(-(((int)d.DayOfWeek + 6) % 7)), // segunda-feira
            "mes" => new DateTime(d.Year, d.Month, 1, 0, 0, 0, DateTimeKind.Utc),
            _ => d
        };
    }

    private static DateTime Avancar(DateTime d, string g) => g switch
    {
        "semana" => d.AddDays(7),
        "mes" => d.AddMonths(1),
        _ => d.AddDays(1)
    };

    private static string Rotulo(DateTime d, string g) => g switch
    {
        "semana" => $"{d:yyyy-MM-dd} (semana)",
        "mes" => d.ToString("yyyy-MM"),
        _ => d.ToString("yyyy-MM-dd")
    };

    // ---------------------------------------------------------------------------------------------
    // RF08 — SLA cumprido/violado por produto, categoria e prioridade
    // ---------------------------------------------------------------------------------------------

    public async Task<RelatorioSlaDto> GerarSlaAsync(FiltroRelatorioDto? filtro, CancellationToken ct = default)
    {
        var f = Normalizar(filtro);
        var agora = DateTime.UtcNow;
        var metricas = await CarregarMetricasAsync(f, ct);

        return new RelatorioSlaDto(
            PorProduto: AgruparSla(metricas, m => m.Produto, agora),
            PorCategoria: AgruparSla(metricas, m => m.Categoria, agora),
            PorPrioridade: AgruparSla(metricas.OrderByDescending(m => m.Prioridade), m => m.Prioridade.ToString(), agora, ordenar: false));
    }

    private static List<SlaPorDimensaoDto> AgruparSla(IEnumerable<ChamadoMetrica> metricas, Func<ChamadoMetrica, string> chave, DateTime agora, bool ordenar = true)
    {
        var grupos = metricas.GroupBy(chave);
        if (ordenar) grupos = grupos.OrderBy(g => g.Key);

        return grupos.Select(g =>
        {
            var lista = g.ToList();
            var res = lista.Select(m => m.SlaResolucaoCumprido(agora)).ToList();
            var resp = lista.Select(m => m.SlaRespostaCumprido(agora)).ToList();
            var resCumpr = res.Count(v => v == true);
            var resViol = res.Count(v => v == false);
            var respCumpr = resp.Count(v => v == true);
            var respViol = resp.Count(v => v == false);
            return new SlaPorDimensaoDto(
                Chave: g.Key,
                TotalChamados: lista.Count,
                ComSla: lista.Count(m => m.PrazoResolucao.HasValue),
                ResolucaoCumprida: resCumpr,
                ResolucaoViolada: resViol,
                ResolucaoPendente: lista.Count(m => m.PrazoResolucao.HasValue) - resCumpr - resViol,
                PercentualResolucaoCumprida: Percentual(resCumpr, resCumpr + resViol),
                RespostaCumprida: respCumpr,
                RespostaViolada: respViol,
                RespostaPendente: lista.Count(m => m.PrazoResposta.HasValue) - respCumpr - respViol,
                PercentualRespostaCumprida: Percentual(respCumpr, respCumpr + respViol));
        }).ToList();
    }

    // ---------------------------------------------------------------------------------------------
    // RF07 — Chamados em risco / estourados (DTO, sem entidade Usuario/SenhaHash)
    // ---------------------------------------------------------------------------------------------

    public async Task<List<ChamadoEmRiscoSlaDto>> ListarChamadosEmRiscoSLAAsync(FiltroRelatorioDto? filtro, double janelaHoras = 2, CancellationToken ct = default)
    {
        var f = Normalizar(filtro);
        var agora = DateTime.UtcNow;
        var limite = agora.AddHours(janelaHoras);

        var lista = await Consulta(f)
            .Where(c => c.Status != StatusEnum.RESOLVIDO && c.Status != StatusEnum.FECHADO)
            .Where(c => c.PrazoResolucao != null && c.PrazoResolucao <= limite)
            .OrderBy(c => c.PrazoResolucao)
            .Select(c => new
            {
                c.Id, c.CodigoPublico, c.Produto, c.Categoria, c.Status, c.Prioridade,
                c.GrupoEmpresaId, GrupoNome = c.GrupoEmpresa.Nome,
                c.AgenteId, AgenteNome = c.Agente != null ? c.Agente.Nome : null,
                c.CriadoEm, c.PrazoResposta, c.PrazoResolucao,
                c.AlertaRiscoSlaEm, c.AlertaEstouroSlaEm, c.AlertaRespostaAtrasadaEm
            })
            .ToListAsync(ct);

        return lista.Select(c =>
        {
            var minutos = (int)Math.Round((c.PrazoResolucao!.Value - agora).TotalMinutes);
            return new ChamadoEmRiscoSlaDto(
                c.Id, c.CodigoPublico, c.Produto, c.Categoria, c.Status, c.Prioridade,
                c.GrupoEmpresaId, c.GrupoNome, c.AgenteId, c.AgenteNome,
                c.CriadoEm, c.PrazoResposta, c.PrazoResolucao,
                minutos,
                minutos < 0 ? "ESTOURADO" : "EM_RISCO",
                c.AlertaRiscoSlaEm, c.AlertaEstouroSlaEm, c.AlertaRespostaAtrasadaEm);
        }).ToList();
    }

    // ---------------------------------------------------------------------------------------------
    // RF09 — Alertas de SLA
    // ---------------------------------------------------------------------------------------------

    public async Task<List<AlertaSlaDto>> ListarAlertasSlaAsync(bool apenasPendentes, TipoAlertaSlaEnum? tipo, int? chamadoId, int? grupoEmpresaId, CancellationToken ct = default)
    {
        IQueryable<AlertaSla> q = _context.AlertasSla.AsNoTracking();
        if (apenasPendentes) q = q.Where(a => a.ReconhecidoEm == null);
        if (tipo.HasValue) q = q.Where(a => a.Tipo == tipo.Value);
        if (chamadoId.HasValue) q = q.Where(a => a.ChamadoId == chamadoId.Value);
        if (grupoEmpresaId.HasValue) q = q.Where(a => a.Chamado.GrupoEmpresaId == grupoEmpresaId.Value);

        return await q
            .OrderByDescending(a => a.CriadoEm)
            .Select(a => new AlertaSlaDto(
                a.Id,
                a.ChamadoId,
                a.Chamado.CodigoPublico,
                a.Tipo,
                a.Tipo.ToString(),
                a.CriadoEm,
                a.ReconhecidoEm,
                a.ReconhecidoPorId,
                a.ReconhecidoPor != null ? a.ReconhecidoPor.Nome : null,
                a.Chamado.Status,
                a.Chamado.Prioridade,
                a.Chamado.Produto,
                a.Chamado.Categoria,
                a.Chamado.GrupoEmpresaId,
                a.Chamado.AgenteId,
                a.Chamado.Agente != null ? a.Chamado.Agente.Nome : null,
                a.Chamado.PrazoResposta,
                a.Chamado.PrazoResolucao))
            .ToListAsync(ct);
    }

    public Task<AlertaSlaDto?> ObterAlertaSlaAsync(int id, CancellationToken ct = default) =>
        _context.AlertasSla.AsNoTracking()
            .Where(a => a.Id == id)
            .Select(a => new AlertaSlaDto(
                a.Id, a.ChamadoId, a.Chamado.CodigoPublico, a.Tipo, a.Tipo.ToString(), a.CriadoEm,
                a.ReconhecidoEm, a.ReconhecidoPorId, a.ReconhecidoPor != null ? a.ReconhecidoPor.Nome : null,
                a.Chamado.Status, a.Chamado.Prioridade, a.Chamado.Produto, a.Chamado.Categoria,
                a.Chamado.GrupoEmpresaId, a.Chamado.AgenteId, a.Chamado.Agente != null ? a.Chamado.Agente.Nome : null,
                a.Chamado.PrazoResposta, a.Chamado.PrazoResolucao))
            .FirstOrDefaultAsync(ct);

    public enum ResultadoReconhecimento { Ok, NaoEncontrado, JaReconhecido }

    /// <summary>Reconhece (dá ciência) um alerta; grava LogAuditoria ALERTA_SLA_RECONHECIDO com o usuário logado.</summary>
    public async Task<ResultadoReconhecimento> ReconhecerAlertaSlaAsync(int id, int usuarioId, CancellationToken ct = default)
    {
        var alerta = await _context.AlertasSla.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (alerta == null) return ResultadoReconhecimento.NaoEncontrado;
        if (!alerta.EstaPendente()) return ResultadoReconhecimento.JaReconhecido;

        alerta.Reconhecer(usuarioId);

        _context.LogsAuditoria.Add(new LogAuditoria
        {
            ChamadoId = alerta.ChamadoId,
            UsuarioId = usuarioId,
            Acao = "ALERTA_SLA_RECONHECIDO",
            CampoAlterado = "AlertaSla.ReconhecidoEm",
            ValorAnterior = $"{alerta.Tipo} #{alerta.Id} pendente",
            ValorNovo = alerta.ReconhecidoEm!.Value.ToString("O"),
            Data = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(ct);
        return ResultadoReconhecimento.Ok;
    }
}
