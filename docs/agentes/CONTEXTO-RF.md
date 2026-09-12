# Contexto compartilhado — Atos Capital · Backlog RF (backend)

Leia este arquivo inteiro antes de escrever código. Ele é a fonte de verdade para a divisão de trabalho.

## O projeto
Sistema de suporte/chamados (helpdesk) da Atos Capital. Monorepo:
- `backend/` — ASP.NET Core Web API **.NET 10** (`net10.0`), EF Core 9 + Npgsql, JWT Bearer, Swagger em `/swagger`.
- `frontend/` — React 18 + Vite + MUI + react-router (não é escopo deste backlog; não editar).
- `docker-compose.yml` — Postgres 16 (5433) + n8n (5678). **Docker NÃO está rodando nesta máquina.** Use o Postgres local (abaixo).

## Ambiente local (já validado, funciona)
- SDK .NET 10 instalado em `~/.dotnet` (não está no PATH global). Em **todo** comando dotnet, exporte antes:
  `export DOTNET_ROOT="$HOME/.dotnet" PATH="$HOME/.dotnet:$HOME/.dotnet/tools:$PATH"`
- `dotnet-ef` 10.x instalado como tool global.
- Postgres 14 (Homebrew) em `localhost:5433`, db `atos_support_db`, user `atos_user` / senha `atos_password` — exatamente o que está em `backend/appsettings.json`. As 5 migrations já foram aplicadas.
  Acesso direto: `psql -h localhost -p 5433 -U atos_user -d atos_support_db`
- Build: `cd backend && dotnet build -nologo -v q`. Rodar: `dotnet run` (Swagger em https://localhost:<porta>/swagger; veja `Properties/launchSettings.json`).
- Seed em `Program.cs`: grupo "Atos Capital" + usuários `admin@atos.com` (ADMIN) e `cliente@atos.com` (CLIENTE). Login em `POST /api/Auth/login` com `{ "email": "..." }` (não há senha ainda — não é escopo corrigir).
- Não existe projeto de testes. Valide com build + `dotnet run` + curl/Swagger. Se criar testes, use xUnit em `backend.Tests/` (novo projeto) — opcional.

## Git — REGRAS RÍGIDAS
- Todos trabalham no MESMO checkout e no MESMO branch: `feat/rf-backend` (já criado a partir de `origin/master`, que é o mais recente).
- **NÃO faça `git commit`, `git add`, `git stash`, `git checkout`, `git reset` ou `git pull`.** O maestro (Claude Code #3) commita ao final. Vocês só editam arquivos.
- `backend/obj` e `backend/bin` estão no `.gitignore`. Não versionar artefatos.

## Domínio (resumo do que existe)
- Enums em `backend/Enums/`: `StatusEnum {ABERTO, EM_ANDAMENTO, AGUARDANDO_CLIENTE, RESOLVIDO, FECHADO}`, `PrioridadeEnum {BAIXA..CRITICA}`, `PapelEnum {CLIENTE=0, AGENTE=1, SUPERVISOR=2, ADMIN=3}`, `TipoInteracaoEnum {PUBLICA, NOTA_INTERNA}`.
- Models em `backend/Models/`: `Chamado` (tem `AlterarStatus`, `AtribuirAgente`, `EstaProximoDeEstourarSLA`, `PrazoResposta/PrazoResolucao/AguardandoDesde/ResolvidoEm/FechadoEm`), `Interacao` (campo `Anexos` string?), `SLACategoria` (`CalcularPrazoResposta/Resolucao`, `FoiViolado`), `LogAuditoria` (Acao, CampoAlterado, ValorAnterior, ValorNovo), `Usuario`, `GrupoEmpresa` (matriz/filial).
- `Data/AppDbContext.cs` — DbSets: Usuarios, GruposEmpresas, Chamados, Interacoes, SLACategorias, LogsAuditoria. Enums mapeados como int.
- JWT claims (ver `Services/AuthService.cs`): `NameIdentifier`=Id, `Role`=Papel (string, ex. "CLIENTE"), `GrupoEmpresaId`. Padrão já usado nos controllers: `[Authorize(Roles = "AGENTE,SUPERVISOR,ADMIN,Agente,Supervisor,Admin")]`.
- `Controllers/ChamadosController.cs` já tem: `GET /api/Chamados` (cliente vê só seu grupo), `GET agentes-disponiveis`, `POST /api/Chamados` (SLA + atribuição automática + auditoria), `PATCH {id}/atribuir`, `POST {id}/interacoes`.
- `Controllers/RelatoriosController.cs` + `Services/RelatorioService.cs`: `em-risco-sla`, `por-produto`, `por-grupo-empresa`, `por-categoria` (SUPERVISOR/ADMIN).
- Auditoria: toda mutação relevante grava um `LogAuditoria`. Mantenha o padrão.
- `Program.cs` serializa JSON com `ReferenceHandler.IgnoreCycles`.

## Contrato compartilhado de eventos (JÁ EXISTE — usar, não redefinir)
`backend/Events/IEventoService.cs`: `Task PublicarAsync(string tipo, int? chamadoId, object payload, CancellationToken ct = default)` e constantes em `TiposEvento` (`chamado.criado`, `chamado.status_alterado`, `chamado.agente_atribuido`, `chamado.resolvido`, `chamado.fechado`, `interacao.criada`, `anexo.adicionado`, `sla.em_risco`, `sla.estourado`).
Hoje está registrado `EventoServiceNoop` no `Program.cs`. Quem produz eventos injeta `IEventoService` e chama `PublicarAsync`. Quem implementa webhooks (Estafeta) substitui o registro pelo `EventoService` real. Nunca coloque `SenhaHash`, token ou dados sensíveis no payload.

## Divisão de trabalho e PROPRIEDADE DE ARQUIVOS (evita conflitos no mesmo checkout)
| Agente | RFs | Arquivos que PODE editar | NÃO toca |
|---|---|---|---|
| **Bússola** — Chamados API | RF04 (PATCH status), RF02 (GET {id} + histórico), RF12 (controle por papel) | `Controllers/ChamadosController.cs`, `DTOs/*Chamado*`, novos DTOs de status/detalhe, `Models/Chamado.cs` (só métodos) | migrations, `RelatorioService`, `Events/`, `Program.cs` (exceto 1 linha de DI se estritamente necessário — avise) |
| **Estafeta** — Eventos & Anexos | RF06 (webhooks), RF11 (upload de anexos) | `Events/*` (novo `EventoService`, `WebhookDispatcher`, options), `Controllers/AnexosController.cs` (NOVO — não mexer em ChamadosController), `Services/ArquivoService.cs`, `Program.cs` (DI + options + static files), `appsettings*.json` (seção `Webhooks`, `Anexos`) | migrations, `ChamadosController.cs`, `RelatorioService` |
| **Ampulheta** — SLA & Relatórios | RF07 (monitoramento), RF09 (alertas de estouro), RF08 (relatórios gerenciais) | `Services/SlaMonitorService.cs` (novo, BackgroundService), `Services/RelatorioService.cs`, `Controllers/RelatoriosController.cs`, `Models/*` (novas colunas/entidades de SLA), `Data/AppDbContext.cs`, **`Migrations/` (ÚNICO dono)**, `Program.cs` (DI do hosted service) | `ChamadosController.cs`, `Events/` (só consome `IEventoService`) |

- **Somente Ampulheta cria migrations.** Se Bússola ou Estafeta precisarem de coluna/tabela nova, peçam: `maestri ask "Ampulheta" "preciso de ... na model X"` e continuem com o resto enquanto esperam. Prefira soluções sem migration (ex.: `Interacao.Anexos` já é string — guarde JSON de caminhos).
- `Program.cs` é compartilhado: edite só a linha que precisa, releia o arquivo imediatamente antes de editar, nunca reescreva o arquivo inteiro.
- Erros de build em arquivos que não são seus são provavelmente edições em andamento de um colega: espere 30–60 s e rode o build de novo. **Nunca "conserte" arquivo de outro dono** — se persistir por >5 min, `maestri ask` ao dono.
- Ao terminar cada RF, escreva um resumo curto (endpoints, decisões, o que falta) em `docs/agentes/RELATORIO-<seu-nome>.md` e avise o maestro.

## Decisão: serialização de enums em JSON
Card Trello "Definir serialização de enums (manter int e converter no front vs JsonStringEnumConverter)".

**Escolhida a Opção A:** a API continua mandando enums (`Status`, `Prioridade`, `Papel`, `TipoInteracao` etc.) como
números inteiros (comportamento padrão do `System.Text.Json`, sem `JsonStringEnumConverter`). A tradução para nomes
legíveis ("Aberto", "Em andamento"...) fica por conta do frontend (card "Mappers" do Frontend).

**Por quê:** não muda nada pra quem já recebe os webhooks (n8n) nem exige tocar em `Program.cs` — é literalmente o
que já está implementado hoje. A Opção B (mandar os nomes em texto) exigiria ajustar o n8n e os testes de
regressão, sem ganho que justifique o custo neste momento.

**Se algum dia migrar para a Opção B:** o único ponto de mudança é `backend/Program.cs`, no
`AddJsonOptions`/`AddControllers` (adicionar `JsonStringEnumConverter` a `options.JsonSerializerOptions.Converters`).

## Padrões de qualidade e segurança (obrigatórios)
- Segurança primeiro: valide entrada, aplique `[Authorize]` + checagem de papel e de grupo (cliente NUNCA vê/altera chamado de outro `GrupoEmpresaId`), retorne 403 (não 404) para acesso negado a recurso que existe, 404 para inexistente.
- Auditoria em toda mutação (`LogAuditoria`).
- Sempre `DateTime.UtcNow`.
- Nada de segredos hardcoded novos; config via `appsettings` + `IOptions<T>`.
- Código e comentários em português (padrão do repo), nomes de rota em PascalCase como já está (`/api/Chamados`).
- Publicar eventos via `IEventoService` nos pontos indicados na sua role.
