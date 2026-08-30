using backend.Data;
using backend.Enums;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class RelatorioService
{
    private readonly AppDbContext _context;

    public RelatorioService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Chamado>> ListarChamadosEmRiscoSLAAsync()
    {
        var agora = DateTime.UtcNow;

        // Chamados não finalizados cujo prazo de resolução estoure nas próximas 2 horas ou já tenha estourado
        return await _context.Chamados
            .Include(c => c.Usuario)
            .Include(c => c.GrupoEmpresa)
            .Where(c => c.Status != StatusEnum.RESOLVIDO && c.Status != StatusEnum.FECHADO)
            .Where(c => c.PrazoResolucao.HasValue && c.PrazoResolucao.Value <= agora.AddHours(2))
            .ToListAsync();
    }

    public async Task<object> GerarPorProdutoAsync()
    {
        return await _context.Chamados
            .GroupBy(c => c.Produto)
            .Select(g => new
            {
                Produto = g.Key,
                Total = g.Count(),
                Abertos = g.Count(c => c.Status == StatusEnum.ABERTO),
                Resolvidos = g.Count(c => c.Status == StatusEnum.RESOLVIDO || c.Status == StatusEnum.FECHADO)
            })
            .ToListAsync();
    }

    public async Task<object> GerarPorGrupoEmpresaAsync()
    {
        return await _context.Chamados
            .Include(c => c.GrupoEmpresa)
            .GroupBy(c => c.GrupoEmpresa.Nome)
            .Select(g => new
            {
                GrupoEmpresa = g.Key,
                Total = g.Count()
            })
            .ToListAsync();
    }

    public async Task<object> GerarPorCategoriaAsync()
    {
        return await _context.Chamados
            .GroupBy(c => c.Categoria)
            .Select(g => new
            {
                Categoria = g.Key,
                Total = g.Count()
            })
            .ToListAsync();
    }
}