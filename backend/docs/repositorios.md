# Entidades e repositórios

As sete entidades persistidas em `Models` herdam de `BaseEntity`, que declara `int Id`.
Novas entidades seguem o mesmo padrão e são registradas normalmente no `AppDbContext`:

```csharp
public class MinhaEntidade : BaseEntity
{
    public string Nome { get; set; } = string.Empty;
}
```

`BaseEntity` não é registrada como entidade no EF Core. Cada entidade concreta mantém sua
tabela, chave e relacionamentos; a herança serve para compartilhar código. DTOs, configurações
e payloads de eventos não são entidades persistidas e não precisam herdar essa classe.

O registro `AddRepositories()` permite injetar `IBaseRepository<T>` para qualquer entidade
mapeada que herde `BaseEntity`. Não é necessário criar um repositório por entidade.

```csharp
public class ConsultaService(IBaseRepository<Chamado> chamados)
{
    public Task<List<Chamado>> ListarDoGrupo(int grupoId, CancellationToken ct) =>
        chamados.ObterTodos()
            .AsNoTracking()
            .Where(c => c.GrupoEmpresaId == grupoId)
            .OrderByDescending(c => c.Id)
            .Take(20)
            .ToListAsync(ct);
}
```

`ObterTodos()` retorna `IQueryable<T>` e não executa a consulta imediatamente. Filtros,
projeções, paginação e `Include` são traduzidos pelo EF ao materializar a consulta. A consulta
deve ser consumida dentro do escopo do repositório. Use `AsNoTracking()` nas leituras;
as regras de visibilidade/autorização permanecem nos consumidores.

- `Obter` / `ObterAsync`: busca por ID, retorna `null` se não existir; aceita carregamento de
  relacionamentos. Exemplo: `await chamados.ObterAsync(id, [c => c.Usuario], ct)`.
- `ObterTodosAsync` / `ContarRegistros`: materialização e contagem assíncronas.
- `Add`, `AddRange`, `Edit`, `Delete`, `RemoveRange`: preparam alterações sem salvar.
- `SalvarAlteracoes` / `SalvarAlteracoesAsync`: persistem todas as alterações do contexto.
- `CriarESalvar`, `EditarESalvar`, `DeletarESalvar` e variantes `Async`: operação seguida de save.
- `ComecarTransacao`: transação explícita, a ser confirmada ou revertida pelo consumidor.
- `GetDbContext`: acesso de infraestrutura; usado pelo monitor de SLA para limpar rastreamento
  após falhas. Consultas comuns devem usar os métodos do repositório.

A exclusão por ID inexistente lança `KeyNotFoundException`. `Edit` marca a entidade inteira
como modificada; em atualizações parciais, prefira buscar a entidade rastreada, modificar
somente as propriedades desejadas e salvar.

Todos os repositórios do mesmo escopo usam o mesmo `AppDbContext`. Por isso, adicionar um
chamado, uma interação e um log em repositórios distintos e chamar `SalvarAlteracoesAsync`
uma vez preserva a gravação atômica. Um método `*ESalvar` também salva alterações pendentes
nos outros repositórios do escopo; use-o apenas quando esse for o limite desejado da operação.
Eventos continuam sendo publicados após a persistência bem-sucedida.

## Verificação

```powershell
dotnet test Tests/backend.Tests/backend.Tests.csproj --configuration Release
```

Os testes usam SQLite em memória para CRUD, relacionamentos e transações. A compatibilidade
com o modelo das migrations é verificada com o provedor PostgreSQL, sem abrir conexão.

Os testes de regressão também iniciam um host HTTP local com os controllers, serviços e
autenticação JWT reais. Exercitam chamados, permissões, anexos, relatórios e o monitor de SLA
com dados sintéticos e eventos capturados em memória. Esse host não executa o bootstrap de
`Program.cs` nem integrações externas; a inicialização com PostgreSQL real exige esse serviço
disponível separadamente.
