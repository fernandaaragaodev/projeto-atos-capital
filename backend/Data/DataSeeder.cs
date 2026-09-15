using backend.Data.Repositories;
using backend.Enums;
using backend.Models;

namespace backend.Data;

/// <summary>
/// Seeds idempotentes chamados pelo Program.cs após Database.Migrate().
/// </summary>
public static class DataSeeder
{
    public const string ProdutoPadrao = "Plataforma";
    public static readonly string[] CategoriasPadrao = ["Acesso", "Erro", "Dúvida"];

    /// <summary>Tempos em HORAS por prioridade: (TempoResposta, TempoResolucao).</summary>
    public static readonly IReadOnlyDictionary<PrioridadeEnum, (int Resposta, int Resolucao)> TemposPorPrioridade =
        new Dictionary<PrioridadeEnum, (int, int)>
        {
            [PrioridadeEnum.CRITICA] = (1, 4),
            [PrioridadeEnum.ALTA] = (2, 8),
            [PrioridadeEnum.MEDIA] = (4, 24),
            [PrioridadeEnum.BAIXA] = (8, 72),
        };

    /// <summary>
    /// Garante as regras de SLA para Produto "Plataforma" x Categorias (Acesso, Erro, Dúvida) x 4 prioridades.
    /// Só insere as combinações que ainda não existem (não altera regras já cadastradas).
    /// </summary>
    /// <returns>Quantidade de regras inseridas.</returns>
    public static int SeedSlaCategorias(IBaseRepository<SLACategoria> slaCategorias)
    {
        var existentes = slaCategorias.ObterTodos()
            .Where(s => s.Produto == ProdutoPadrao)
            .Select(s => new { s.Categoria, s.Prioridade })
            .ToList()
            .Select(s => (s.Categoria, s.Prioridade))
            .ToHashSet();

        var novas = new List<SLACategoria>();
        foreach (var categoria in CategoriasPadrao)
        {
            foreach (var (prioridade, tempos) in TemposPorPrioridade)
            {
                if (existentes.Contains((categoria, prioridade))) continue;
                novas.Add(new SLACategoria
                {
                    Produto = ProdutoPadrao,
                    Categoria = categoria,
                    Prioridade = prioridade,
                    TempoResposta = tempos.Resposta,
                    TempoResolucao = tempos.Resolucao
                });
            }
        }

        if (novas.Count > 0)
        {
            slaCategorias.AddRange(novas);
            slaCategorias.SalvarAlteracoes();
        }

        return novas.Count;
    }
}
