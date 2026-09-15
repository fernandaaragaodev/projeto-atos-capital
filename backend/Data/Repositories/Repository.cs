using System.Linq.Expressions;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace backend.Data.Repositories;

public class Repository<TEntity>(AppDbContext context) : IBaseRepository<TEntity>
    where TEntity : BaseEntity
{
    /// <summary>
    /// A consulta só é executada ao materializar os resultados. Use AsNoTracking para leitura.
    /// Filtros de autorização e de negócio continuam sendo responsabilidade do chamador.
    /// </summary>
    public IQueryable<TEntity> ObterTodos() => context.Set<TEntity>();

    public Task<List<TEntity>> ObterTodosAsync(CancellationToken cancellationToken = default) =>
        ObterTodos().ToListAsync(cancellationToken);

    public TEntity? Obter(int id, params Expression<Func<TEntity, object>>[] includes) =>
        includes.Length == 0
            ? context.Set<TEntity>().Find(id)
            : IncluirRelacionamentos(includes).FirstOrDefault(e => e.Id == id);

    public async Task<TEntity?> ObterAsync(int id, CancellationToken cancellationToken = default) =>
        await context.Set<TEntity>().FindAsync([id], cancellationToken);

    public Task<TEntity?> ObterAsync(int id, Expression<Func<TEntity, object>>[] includes,
        CancellationToken cancellationToken = default) =>
        includes.Length == 0
            ? ObterAsync(id, cancellationToken)
            : IncluirRelacionamentos(includes).FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

    public Task<int> ContarRegistros(IQueryable<TEntity> query, CancellationToken cancellationToken = default) =>
        query.CountAsync(cancellationToken);

    private IQueryable<TEntity> IncluirRelacionamentos(IEnumerable<Expression<Func<TEntity, object>>> includes)
    {
        var query = ObterTodos();
        foreach (var include in includes)
            query = query.Include(include);
        return query;
    }

    public TEntity Add(TEntity entidade)
    {
        context.Set<TEntity>().Add(entidade);
        return entidade;
    }

    public void AddRange(IEnumerable<TEntity> entidades) => context.Set<TEntity>().AddRange(entidades);

    public TEntity Edit(TEntity entidade)
    {
        context.Entry(entidade).State = EntityState.Modified;
        return entidade;
    }

    public void Delete(int id)
    {
        var entidade = Obter(id) ?? throw EntidadeNaoEncontrada(id);
        context.Set<TEntity>().Remove(entidade);
    }

    public void RemoveRange(IEnumerable<TEntity> entidades) => context.Set<TEntity>().RemoveRange(entidades);

    public TEntity CriarESalvar(TEntity entidade)
    {
        Add(entidade);
        SalvarAlteracoes();
        return entidade;
    }

    public async Task<TEntity> CriarESalvarAsync(TEntity entidade, CancellationToken cancellationToken = default)
    {
        Add(entidade);
        await SalvarAlteracoesAsync(cancellationToken);
        return entidade;
    }

    public TEntity EditarESalvar(TEntity entidade)
    {
        Edit(entidade);
        SalvarAlteracoes();
        return entidade;
    }

    public async Task<TEntity> EditarESalvarAsync(TEntity entidade, CancellationToken cancellationToken = default)
    {
        Edit(entidade);
        await SalvarAlteracoesAsync(cancellationToken);
        return entidade;
    }

    public void DeletarESalvar(int id)
    {
        Delete(id);
        SalvarAlteracoes();
    }

    public async Task DeletarESalvarAsync(int id, CancellationToken cancellationToken = default)
    {
        var entidade = await ObterAsync(id, cancellationToken) ?? throw EntidadeNaoEncontrada(id);
        context.Set<TEntity>().Remove(entidade);
        await SalvarAlteracoesAsync(cancellationToken);
    }

    public void SalvarAlteracoes() => context.SaveChanges();

    public async Task SalvarAlteracoesAsync(CancellationToken cancellationToken = default) =>
        await context.SaveChangesAsync(cancellationToken);

    public Task<IDbContextTransaction> ComecarTransacao(CancellationToken cancellationToken = default) =>
        context.Database.BeginTransactionAsync(cancellationToken);

    public DbContext GetDbContext() => context;

    private static KeyNotFoundException EntidadeNaoEncontrada(int id) =>
        new($"{typeof(TEntity).Name} com Id {id} não encontrado.");
}
