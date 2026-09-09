using System.Linq.Expressions;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace backend.Data.Repositories;

/// <summary>
/// Acesso comum às entidades. Add, Edit, Delete e operações em lote apenas preparam alterações.
/// SalvarAlteracoes persiste todas as alterações do DbContext compartilhado no mesmo escopo.
/// </summary>
public interface IBaseRepository<TEntity> where TEntity : BaseEntity
{
    IQueryable<TEntity> ObterTodos();
    Task<List<TEntity>> ObterTodosAsync(CancellationToken cancellationToken = default);
    TEntity? Obter(int id, params Expression<Func<TEntity, object>>[] includes);
    Task<TEntity?> ObterAsync(int id, CancellationToken cancellationToken = default);
    Task<TEntity?> ObterAsync(int id, Expression<Func<TEntity, object>>[] includes,
        CancellationToken cancellationToken = default);
    Task<int> ContarRegistros(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

    TEntity Add(TEntity entidade);
    void AddRange(IEnumerable<TEntity> entidades);
    TEntity Edit(TEntity entidade);
    void Delete(int id);
    void RemoveRange(IEnumerable<TEntity> entidades);

    TEntity CriarESalvar(TEntity entidade);
    Task<TEntity> CriarESalvarAsync(TEntity entidade, CancellationToken cancellationToken = default);
    TEntity EditarESalvar(TEntity entidade);
    Task<TEntity> EditarESalvarAsync(TEntity entidade, CancellationToken cancellationToken = default);
    void DeletarESalvar(int id);
    Task DeletarESalvarAsync(int id, CancellationToken cancellationToken = default);
    void SalvarAlteracoes();
    Task SalvarAlteracoesAsync(CancellationToken cancellationToken = default);
    Task<IDbContextTransaction> ComecarTransacao(CancellationToken cancellationToken = default);

    // Acesso explícito para operações de infraestrutura, como limpar o rastreamento após uma falha.
    DbContext GetDbContext();
}
