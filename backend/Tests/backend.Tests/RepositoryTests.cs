using backend.Data;
using backend.Data.Repositories;
using backend.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace backend.Tests;

public sealed class RepositoryTests : IDisposable
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private readonly ServiceProvider _provider;
    private readonly IServiceScope _scope;
    private AppDbContext Context => _scope.ServiceProvider.GetRequiredService<AppDbContext>();
    private IBaseRepository<T> Repo<T>() where T : BaseEntity =>
        _scope.ServiceProvider.GetRequiredService<IBaseRepository<T>>();

    public RepositoryTests()
    {
        _connection.Open();
        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));
        services.AddRepositories();
        _provider = services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
        _scope = _provider.CreateScope();
        Context.Database.EnsureCreated();
    }

    [Fact]
    public void TodasAsEntidadesHerdamIdSemCriarHierarquiaNoBanco()
    {
        var entidades = Context.Model.GetEntityTypes().ToArray();
        Assert.Equal(7, entidades.Length);
        Assert.Null(Context.Model.FindEntityType(typeof(BaseEntity)));
        Assert.Equal(7, entidades.Select(e => e.GetTableName()).Distinct().Count());

        foreach (var entidade in entidades)
        {
            Assert.True(typeof(BaseEntity).IsAssignableFrom(entidade.ClrType));
            Assert.Null(entidade.BaseType);
            var chave = Assert.Single(entidade.FindPrimaryKey()!.Properties);
            Assert.Equal(nameof(BaseEntity.Id), chave.Name);
            Assert.Equal(typeof(BaseEntity), chave.PropertyInfo!.DeclaringType);
            var repositoryType = typeof(IBaseRepository<>).MakeGenericType(entidade.ClrType);
            Assert.NotNull(_scope.ServiceProvider.GetRequiredService(repositoryType));
        }
    }

    [Fact]
    public void ModeloPostgreSqlContinuaCompativelComAsMigrations()
    {
        // Só compara metadados; não abre conexão nem executa migrations.
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=model_check;Username=unused;Password=unused")
            .Options;
        using var context = new AppDbContext(options);
        Assert.False(context.Database.HasPendingModelChanges());
    }

    [Fact]
    public void RepositoriosCompartilhamContextoSomenteNoMesmoEscopo()
    {
        Assert.Same(Context, Repo<Usuario>().GetDbContext());
        Assert.Same(Context, Repo<Chamado>().GetDbContext());
        Assert.Same(Repo<Usuario>(), Repo<Usuario>());
        using var outroEscopo = _provider.CreateScope();
        Assert.NotSame(Context, outroEscopo.ServiceProvider.GetRequiredService<IBaseRepository<Usuario>>().GetDbContext());
    }

    [Fact]
    public async Task ConsultasPermitemFiltrosPaginacaoEIncludes()
    {
        var grupos = Repo<GrupoEmpresa>();
        var usuarios = Repo<Usuario>();
        var grupo = grupos.Add(new GrupoEmpresa { Nome = "Equipe" });
        usuarios.AddRange([
            new Usuario { Nome = "Ana", GrupoEmpresa = grupo },
            new Usuario { Nome = "Bia", GrupoEmpresa = grupo },
            new Usuario { Nome = "Caio", GrupoEmpresa = grupo }
        ]);
        Assert.Empty(await usuarios.ObterTodosAsync()); // Add não persiste implicitamente.
        await usuarios.SalvarAlteracoesAsync();
        Context.ChangeTracker.Clear();

        var query = usuarios.ObterTodos().AsNoTracking().Where(u => u.Nome != "Caio");
        Assert.Equal(2, await usuarios.ContarRegistros(query));
        var pagina = await query.OrderBy(u => u.Nome).Skip(1).Take(1).ToListAsync();
        Assert.Equal("Bia", Assert.Single(pagina).Nome);
        Assert.Empty(Context.ChangeTracker.Entries());

        var usuario = await usuarios.ObterAsync(pagina[0].Id, [u => u.GrupoEmpresa]);
        Assert.Equal("Equipe", usuario!.GrupoEmpresa.Nome);
        Assert.Same(usuario, await usuarios.ObterAsync(usuario.Id));
        Context.ChangeTracker.Clear();
        Assert.Equal("Equipe", usuarios.Obter(usuario.Id, u => u.GrupoEmpresa)!.GrupoEmpresa.Nome);
    }

    [Fact]
    public async Task CrudSincronoEAssincronoPersisteEdicoesEExclusoes()
    {
        var repository = Repo<SLACategoria>();
        var primeira = repository.CriarESalvar(new SLACategoria { Produto = "Original" });
        Assert.True(primeira.Id > 0);
        primeira.Produto = "Editado";
        repository.EditarESalvar(primeira);
        Context.ChangeTracker.Clear();
        Assert.Equal("Editado", repository.Obter(primeira.Id)!.Produto);
        repository.DeletarESalvar(primeira.Id);
        Assert.Null(repository.Obter(primeira.Id));

        var segunda = await repository.CriarESalvarAsync(new SLACategoria { Produto = "Original" });
        Context.ChangeTracker.Clear();
        await repository.EditarESalvarAsync(new SLACategoria { Id = segunda.Id, Produto = "Atualizado" });
        Context.ChangeTracker.Clear();
        Assert.Equal("Atualizado", (await repository.ObterAsync(segunda.Id))!.Produto);
        await repository.DeletarESalvarAsync(segunda.Id);
        Assert.Null(await repository.ObterAsync(segunda.Id));

        Assert.Throws<KeyNotFoundException>(() => repository.DeletarESalvar(int.MaxValue));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => repository.DeletarESalvarAsync(int.MaxValue));
    }

    [Fact]
    public async Task UmSavePersisteChamadoInteracaoELogComRelacionamentos()
    {
        var usuario = Repo<Usuario>().Add(new Usuario { Nome = "Autor", GrupoEmpresa = new GrupoEmpresa { Nome = "Grupo" } });
        var chamado = Repo<Chamado>().Add(new Chamado { Usuario = usuario, GrupoEmpresa = usuario.GrupoEmpresa });
        var interacao = Repo<Interacao>().Add(new Interacao { Chamado = chamado, Autor = usuario, Mensagem = "Mensagem" });
        var log = Repo<LogAuditoria>().Add(new LogAuditoria { Chamado = chamado, Usuario = usuario, Acao = "CRIAR" });
        await Repo<Chamado>().SalvarAlteracoesAsync();
        Context.ChangeTracker.Clear();

        var salvo = await Repo<Chamado>().ObterAsync(chamado.Id, [c => c.Interacoes, c => c.LogsAuditoria]);
        Assert.Equal(interacao.Id, Assert.Single(salvo!.Interacoes).Id);
        Assert.Equal(log.Id, Assert.Single(salvo.LogsAuditoria).Id);
    }

    [Fact]
    public async Task FalhaDeRelacionamentoNaoPersisteAlteracoesParciais()
    {
        Repo<GrupoEmpresa>().Add(new GrupoEmpresa { Nome = "Não deve persistir" });
        Repo<Usuario>().Add(new Usuario { GrupoEmpresaId = int.MaxValue });
        await Assert.ThrowsAsync<DbUpdateException>(() => Repo<GrupoEmpresa>().SalvarAlteracoesAsync());
        Context.ChangeTracker.Clear();
        Assert.Empty(await Repo<GrupoEmpresa>().ObterTodosAsync());
        Assert.Empty(await Repo<Usuario>().ObterTodosAsync());
    }

    [Fact]
    public async Task TransacaoPodeReverterGravacaoERemoverLotes()
    {
        var repository = Repo<SLACategoria>();
        await using (var transaction = await repository.ComecarTransacao())
        {
            await repository.CriarESalvarAsync(new SLACategoria());
            await transaction.RollbackAsync();
        }
        Context.ChangeTracker.Clear();
        Assert.Empty(await repository.ObterTodosAsync());

        repository.AddRange([new SLACategoria(), new SLACategoria()]);
        repository.SalvarAlteracoes();
        repository.RemoveRange(await repository.ObterTodosAsync());
        await repository.SalvarAlteracoesAsync();
        Assert.Empty(await repository.ObterTodosAsync());
    }

    [Fact]
    public async Task ConsultasRespeitamCancelamento()
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Repo<Usuario>().ObterTodosAsync(cancellation.Token));
    }

    public void Dispose()
    {
        _scope.Dispose();
        _provider.Dispose();
        _connection.Dispose();
    }
}
