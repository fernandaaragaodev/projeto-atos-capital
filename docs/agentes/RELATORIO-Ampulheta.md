# Relatório — Ampulheta (RF07 Monitoramento de SLA · RF09 Alertas de estouro · RF08 Relatórios gerenciais)

Branch `feat/rf-backend`. Nada foi commitado (o maestro commita). Build `dotnet build -nologo -v q`: 0 erros, 0 avisos. Endpoints validados com `dotnet run` + curl (detalhes na seção "Validação").

## 1. Migration `AdicionarAlertasSla` (aplicada no banco local)

Arquivo: `backend/Migrations/20260908230311_AdicionarAlertasSla.cs` (+ Designer + snapshot atualizado). Aplicada com `dotnet ef database update`. `dotnet ef migrations has-pending-model-changes` → "No changes have been made to the model since the last migration" (conferido após as edições de métodos do Bússola em `Chamado.cs`).

Conteúdo:
- **Colunas novas em `Chamados`** (todas `timestamp with time zone NULL`): `AlertaRiscoSlaEm`, `AlertaEstouroSlaEm`, `AlertaRespostaAtrasadaEm`. Marcadores "já alertei" — o monitor só dispara quando estão nulas.
- **Tabela nova `AlertasSla`**: `Id`, `ChamadoId` (FK → Chamados, cascade), `Tipo` (int, enum `TipoAlertaSlaEnum`), `CriadoEm`, `ReconhecidoEm?`, `ReconhecidoPorId?` (FK → Usuarios, restrict).
- **Índices**: `IX_AlertasSla_ChamadoId_Tipo`, `IX_AlertasSla_ReconhecidoEm`, `IX_AlertasSla_ReconhecidoPorId`, `IX_Chamados_Status_PrazoResolucao` (consulta do monitor e do em-risco-sla).

Arquivos de modelo:
- `backend/Enums/TipoAlertaSlaEnum.cs` — `RESPOSTA_ATRASADA = 0`, `RISCO_RESOLUCAO = 1`, `ESTOURO_RESOLUCAO = 2`.
- `backend/Models/AlertaSla.cs` — entidade + `EstaPendente()` e `Reconhecer(usuarioId)`.
- `backend/Models/Chamado.cs` — 3 propriedades de alerta + navegação `AlertasSla`.
- `backend/Data/AppDbContext.cs` — `DbSet<AlertaSla> AlertasSla`, conversão do enum para int, relacionamentos e índices.

Ninguém (Bússola/Estafeta) pediu coluna/tabela adicional durante a sessão.

## 2. RF07/RF09 — `SlaMonitorService` (BackgroundService)

Arquivos: `backend/Services/SlaMonitorService.cs`, `backend/Services/SlaOptions.cs`. Registro no `Program.cs`:

```csharp
builder.Services.Configure<SlaOptions>(builder.Configuration.GetSection(SlaOptions.Secao));
builder.Services.AddSingleton<SlaMonitorService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<SlaMonitorService>());
```

(registrado como singleton + hosted service para que o `RelatoriosController` possa injetá-lo e disparar um ciclo manual).

Configuração — seção `Sla` do `appsettings.json` (todas com default no código, seção opcional):

| Chave | Default | Uso |
|---|---|---|
| `Sla:IntervaloSegundos` | 60 | intervalo entre ciclos (mínimo efetivo 5s; relido a cada ciclo via `IOptionsMonitor`) |
| `Sla:AtrasoInicialSegundos` | 10 | espera antes do primeiro ciclo após o start |
| `Sla:JanelaRiscoHoras` | 2 | janela de "em risco" (mesma regra de `Chamado.EstaProximoDeEstourarSLA`) |

Ciclo (`ExecutarCicloAsync`): abre um scope, faz **uma única query** nos chamados com `Status ∉ {RESOLVIDO, FECHADO}` que tenham algum prazo exigindo alerta ainda não disparado; a existência de resposta de agente é calculada no banco por subquery `EXISTS` (autor com Papel AGENTE/SUPERVISOR/ADMIN), sem carregar interações. Para cada chamado:

1. **RESPOSTA_ATRASADA**: `PrazoResposta < agora` e nenhuma interação de AGENTE/SUPERVISOR/ADMIN → preenche `AlertaRespostaAtrasadaEm`, grava `AlertaSla`, `LogAuditoria` (Acao `ALERTA_RESPOSTA_ATRASADA`, CampoAlterado `PrazoResposta`), publica **`sla.estourado`** com `TipoAlerta = "RESPOSTA_ATRASADA"` e `MinutosAtraso`.
2. **ESTOURO_RESOLUCAO**: `PrazoResolucao < agora` → `AlertaEstouroSlaEm`, `AlertaSla`, `LogAuditoria` (`ALERTA_SLA_ESTOURO`), evento **`sla.estourado`** com `MinutosAtraso`.
3. **RISCO_RESOLUCAO** (só se não estourou): `agora ≤ PrazoResolucao ≤ agora + JanelaRiscoHoras` → `AlertaRiscoSlaEm`, `AlertaSla`, `LogAuditoria` (`ALERTA_SLA_RISCO`), evento **`sla.em_risco`** com `MinutosRestantes`.

`SaveChangesAsync` acontece **antes** de publicar (evento só sai se o banco confirmou). Cada chamado é isolado em try/catch (falha em um não impede os outros; `ChangeTracker.Clear()` no erro); o loop externo também captura tudo e loga — o host nunca cai. `CancellationToken` é respeitado em todas as chamadas async e no `Task.Delay`.

Payload dos eventos (`SlaEventoPayload`, sem dados sensíveis):

```json
{ "chamadoId": 2, "codigoPublico": "ATOS-20260908-46AB", "grupoEmpresaId": 1, "agenteId": 3,
  "prioridade": "ALTA", "status": "EM_ANDAMENTO", "tipoAlerta": "ESTOURO_RESOLUCAO",
  "prazoResposta": "2026-09-08T20:09:40Z", "prazoResolucao": "2026-09-08T22:54:40Z",
  "minutosRestantes": null, "minutosAtraso": 15 }
```

**Decisão — `UsuarioId` da auditoria dos alertas:** o "usuário sistema" é o admin do seed (`admin@atos.com`); se não existir, o primeiro ADMIN por Id; se não houver ADMIN, o agente do chamado; em último caso o solicitante. Motivo: o alerta é gerado pelo sistema, não por uma ação do agente — atribuir ao agente distorceria o histórico dele.

**Decisão — evento da resposta atrasada:** publicado como `sla.estourado` (o SLA de resposta foi de fato violado), diferenciado pelo campo `tipoAlerta`. Consumidores que só querem estouro de resolução filtram por `tipoAlerta == "ESTOURO_RESOLUCAO"`.

## 3. Seed idempotente de SLACategorias

`backend/Data/DataSeeder.cs` → `DataSeeder.SeedSlaCategorias(context)`, chamado no bloco de seed do `Program.cs` após `Database.Migrate()`. Insere apenas as combinações (Produto, Categoria, Prioridade) ausentes; não altera regras existentes. Produto `Plataforma` × Categorias `Acesso`, `Erro`, `Dúvida` × 4 prioridades, tempos em **horas**:

| Prioridade | TempoResposta | TempoResolucao |
|---|---|---|
| CRITICA | 1 | 4 |
| ALTA | 2 | 8 |
| MEDIA | 4 | 24 |
| BAIXA | 8 | 72 |

Validado: 12 linhas criadas no primeiro start; nos starts seguintes continuam 12 (idempotente).

## 4. Endpoints — `RelatoriosController` (`[Authorize(Roles = "SUPERVISOR,ADMIN,...")]`)

Filtros comuns via query em todos os relatórios: `dataInicio`, `dataFim`, `grupoEmpresaId`, `agenteId`, `produto` (DTO `FiltroRelatorioDto`). Regras: datas sem fuso são tratadas como UTC; `dataFim` sem hora é inclusiva (vai até 23:59:59); o recorte de período é por `CriadoEm` (exceto onde indicado); `produto` compara case-insensitive. Validação retorna 400 com `{ "mensagem": "..." }` (`dataFim < dataInicio`, ids ≤ 0, granularidade inválida).

DTOs em `backend/DTOs/RelatorioDtos.cs` e `backend/DTOs/AlertaSlaDtos.cs` (records tipados; nenhum endpoint retorna entidade).

### RF08

| Endpoint | Retorno |
|---|---|
| `GET /api/Relatorios/resumo` | `ResumoRelatorioDto` |
| `GET /api/Relatorios/por-agente` | `List<RelatorioPorAgenteDto>` |
| `GET /api/Relatorios/por-status` | `List<TotalPorStatusDto>` (sempre os 5 status, zero incluído) |
| `GET /api/Relatorios/por-prioridade` | `List<TotalPorPrioridadeDto>` (4 prioridades, CRITICA primeiro) |
| `GET /api/Relatorios/evolucao?granularidade=dia\|semana\|mes` | `EvolucaoRelatorioDto` (série com buckets vazios preenchidos) |
| `GET /api/Relatorios/sla` | `RelatorioSlaDto` (por produto, categoria e prioridade) |
| `GET /api/Relatorios/por-produto` | `List<TotalPorProdutoDto>` (agora com filtros e contagem por status) |
| `GET /api/Relatorios/por-grupo-empresa` | `List<TotalPorGrupoEmpresaDto>` |
| `GET /api/Relatorios/por-categoria` | `List<TotalPorCategoriaDto>` |

Exemplo `GET /api/Relatorios/resumo`:

```json
{"totalChamados":4,
 "totaisPorStatus":[{"status":0,"nome":"ABERTO","total":1},{"status":1,"nome":"EM_ANDAMENTO","total":1},
   {"status":2,"nome":"AGUARDANDO_CLIENTE","total":0},{"status":3,"nome":"RESOLVIDO","total":2},{"status":4,"nome":"FECHADO","total":0}],
 "abertosHoje":4,"resolvidosNoPeriodo":2,"emAbertoNoMomento":2,
 "tempoMedioPrimeiraRespostaHoras":0.01,"tempoMedioResolucaoHoras":0.01,
 "chamadosComSlaResolucaoAvaliados":2,"percentualDentroSlaResolucao":50,
 "chamadosComSlaRespostaAvaliados":3,"percentualDentroSlaResposta":33.33}
```

Exemplo `GET /api/Relatorios/por-agente`:

```json
[{"agenteId":3,"agenteNome":"Agente Teste","chamadosAtribuidos":3,"resolvidos":2,"abertosNoMomento":1,
  "tempoMedioResolucaoHoras":0.01,"chamadosComSlaAvaliados":2,"percentualSlaCumprido":50}]
```

Exemplo `GET /api/Relatorios/evolucao?granularidade=semana&dataInicio=2026-09-01&dataFim=2026-09-08`:

```json
{"granularidade":"semana","inicio":"2026-08-31T00:00:00Z","fim":"2026-09-08T23:59:59.9999999Z",
 "serie":[{"periodo":"2026-08-31T00:00:00Z","rotulo":"2026-08-31 (semana)","abertos":0,"resolvidos":0},
          {"periodo":"2026-09-07T00:00:00Z","rotulo":"2026-09-07 (semana)","abertos":4,"resolvidos":2}]}
```

Exemplo `GET /api/Relatorios/sla` (trecho de `porPrioridade`):

```json
{"chave":"ALTA","totalChamados":1,"comSla":1,
 "resolucaoCumprida":0,"resolucaoViolada":1,"resolucaoPendente":0,"percentualResolucaoCumprida":0,
 "respostaCumprida":0,"respostaViolada":1,"respostaPendente":0,"percentualRespostaCumprida":0}
```

Exemplo `GET /api/Relatorios/por-produto`:

```json
[{"produto":"Plataforma","total":3,"abertos":0,"emAndamento":1,"aguardandoCliente":0,"resolvidos":2,"fechados":0}]
```

Definições das métricas:
- **Primeira resposta** = primeira `Interacao` cujo autor não é CLIENTE (subquery `Min` traduzida pelo Npgsql).
- **SLA de resolução**: cumprido se `ResolvidoEm ≤ PrazoResolucao`; violado se resolvido depois do prazo **ou** aberto com prazo já vencido; **pendente** (não entra no %) se aberto e dentro do prazo. Mesma lógica para o **SLA de resposta** usando a primeira resposta e `PrazoResposta`.
- **Resolvidos no período** conta por `ResolvidoEm` dentro de `[dataInicio, dataFim]` (independente da data de abertura); os demais totais recortam por `CriadoEm`.
- **Abertos hoje** = `CriadoEm ≥ hoje 00:00 UTC`.
- `por-agente` lista todos os usuários com Papel AGENTE (mesmo com zero chamados) mais qualquer usuário que tenha chamado atribuído. "Resolvidos" = status RESOLVIDO ou FECHADO.
- `evolucao`: "abertos" por `CriadoEm`, "resolvidos" por `ResolvidoEm`; semana começa na segunda; sem `dataInicio` a série vai do dado mais antigo até agora (últimos 30 dias se não há dados).
- Percentuais são `null` quando não há chamados avaliáveis (evita 0% enganoso).

### RF07

`GET /api/Relatorios/em-risco-sla?janelaHoras=2` → `List<ChamadoEmRiscoSlaDto>` (chamados abertos com `PrazoResolucao ≤ agora + janela`, incluindo já estourados; `situacao` = `EM_RISCO` | `ESTOURADO`, `minutosParaPrazoResolucao` negativo quando estourado; sem `Usuario`/`SenhaHash`). Aceita os filtros comuns.

```json
[{"id":1,"codigoPublico":"ATOS-20260908-9519","produto":"Plataforma","categoria":"Erro","status":1,"prioridade":3,
  "grupoEmpresaId":1,"grupoEmpresa":"Atos Capital","agenteId":3,"agenteNome":"Agente Teste",
  "criadoEm":"2026-09-08T23:09:23Z","prazoResposta":"2026-09-08T22:39:40Z","prazoResolucao":"2026-09-09T00:09:40Z",
  "minutosParaPrazoResolucao":60,"situacao":"EM_RISCO",
  "alertaRiscoSlaEm":"2026-09-08T23:09:40Z","alertaEstouroSlaEm":null,"alertaRespostaAtrasadaEm":"2026-09-08T23:09:40Z"}]
```

### RF09

| Endpoint | Comportamento |
|---|---|
| `GET /api/Relatorios/alertas-sla?apenasPendentes=true&tipo=&chamadoId=&grupoEmpresaId=` | `List<AlertaSlaDto>` ordenada por `criadoEm` desc. `apenasPendentes` default `true`. `tipo` aceita nome ou número do enum. |
| `PATCH /api/Relatorios/alertas-sla/{id}/reconhecer` | 200 + `AlertaSlaDto` atualizado; **404** se não existe; **409** se já reconhecido. Grava `LogAuditoria` `ALERTA_SLA_RECONHECIDO` com o usuário logado. |
| `POST /api/Relatorios/alertas-sla/verificar` (**somente ADMIN**, extra) | Executa um ciclo do monitor agora e devolve `StatusMonitorSlaDto` (`ultimaExecucaoEm`, `totalCiclos`, `totalAlertasDisparados`, `ultimoErro`, `alertasDisparadosAgora`). Útil para operação e testes. |

Exemplo de `AlertaSlaDto`:

```json
{"id":3,"chamadoId":2,"codigoPublico":"ATOS-20260908-46AB","tipo":2,"tipoNome":"ESTOURO_RESOLUCAO",
 "criadoEm":"2026-09-08T23:09:40Z","reconhecidoEm":null,"reconhecidoPorId":null,"reconhecidoPorNome":null,
 "statusChamado":1,"prioridade":2,"produto":"Plataforma","categoria":"Acesso","grupoEmpresaId":1,
 "agenteId":3,"agenteNome":"Agente Teste","prazoResposta":"2026-09-08T20:09:40Z","prazoResolucao":"2026-09-08T22:54:40Z"}
```

Exemplo do `verificar`:

```json
{"ultimaExecucaoEm":"2026-09-08T23:09:40Z","totalCiclos":3,"totalAlertasDisparados":3,"ultimoErro":null,"alertasDisparadosAgora":3}
```

## 5. Validação executada (dotnet run + curl)

Cenário montado no banco local: usuário `agente@atos.com` (Papel AGENTE, inserido via SQL — não há endpoint de cadastro), 4 chamados abertos pelo `cliente@atos.com`, prazos manipulados via SQL para provocar os alertas.

- C1 (CRITICA, sem resposta de agente, `PrazoResposta` −30 min, `PrazoResolucao` +1h) → **RESPOSTA_ATRASADA + RISCO_RESOLUCAO**.
- C2 (ALTA, com interação do agente, `PrazoResolucao` −15 min) → **só ESTOURO_RESOLUCAO** (não gerou resposta atrasada, como esperado).
- C3 (MEDIA, dentro do prazo) e C4 (produto sem regra de SLA, sem prazos) → nenhum alerta.
- Segundo ciclo imediatamente após → `alertasDisparadosAgora: 0` (sem repetição). O loop em background também executou sozinho (ciclos contabilizados sem intervenção).
- Auditoria: 3 `LogAuditoria` (`ALERTA_RESPOSTA_ATRASADA`, `ALERTA_SLA_RISCO`, `ALERTA_SLA_ESTOURO`) com `UsuarioId = 1` (admin do seed).
- Reconhecer: 200 → 409 na repetição → 404 para id inexistente; lista de pendentes caiu de 3 para 2.
- Papéis: CLIENTE e AGENTE recebem 403 em todos os endpoints; AGENTE recebe 403 no `verificar`; sem token 401.
- Todos os 13 endpoints de `/api/Relatorios` respondem 200 (com e sem filtros) e aparecem no Swagger; filtros inválidos retornam 400.
- Eventos foram publicados via `IEventoService` (no início com o `EventoServiceNoop`; no final o build já compilou contra o `EventoService` real do Estafeta, sem alteração de código do meu lado).

## 6. Decisões técnicas

- **Cálculos em memória, documentados no código**: tempos médios, % de SLA e série temporal são calculados sobre uma projeção enxuta (`ChamadoMetrica`: ids, status, datas, prazos e primeira resposta) do conjunto já filtrado, porque o Npgsql não traduz `TimeSpan.TotalHours`/`date_trunc` de forma confiável. Contagens por status/produto/grupo/categoria/prioridade rodam no banco via `GroupBy`.
- **GroupBy + record**: o EF Core 9 não traduz `Count(predicado)` dentro de construtor de record na projeção de `GroupBy`; por isso os três agrupamentos (por-produto, por-grupo-empresa, por-categoria) projetam em tipo anônimo no banco e mapeiam para o record em memória (bug encontrado e corrigido durante os testes).
- `AsNoTracking()` em todas as consultas de relatório.
- `em-risco-sla` mantém a semântica anterior (inclui estourados) e passa a aceitar `janelaHoras` e os filtros comuns.
- `appsettings.json`: adicionada apenas a seção `Sla` (o arquivo é do Estafeta; a edição foi cirúrgica, releitura imediata antes).

## 7. Limitações e pendências

- **Chamados sem `SLACategoria` correspondente ficam sem prazo** (`PrazoResposta`/`PrazoResolucao` nulos) e portanto nunca geram alerta nem entram nos percentuais de SLA (aparecem em `comSla = 0` no relatório `/sla`). O seed cobre só `Plataforma` × Acesso/Erro/Dúvida; outros produtos/categorias precisam de regras cadastradas (não há endpoint de CRUD de SLACategoria — sugestão de RF futuro).
- Se o monitor ficar parado por mais de `JanelaRiscoHoras` e o chamado já estourar, só o alerta de ESTOURO é gerado (o de RISCO não é retroativo) — comportamento intencional.
- Status `AGUARDANDO_CLIENTE` não pausa o relógio do SLA (não há regra de pausa no modelo); o monitor trata igual aos demais abertos.
- `FoiViolado` de `SLACategoria` não foi alterado (fora do escopo); a lógica de SLA dos relatórios está em `RelatorioService`.
- O endpoint `POST alertas-sla/verificar` é um extra (não estava na role) — pode ser removido se o maestro preferir.
- Dados de teste deixados no banco local: usuário `agente@atos.com` (Id 3), chamados 1–4, 3 alertas (1 reconhecido) e os logs correspondentes. Não afetam código.
- Não há projeto de testes automatizados; validação foi manual (build + curl).

## 8. Arquivos criados/alterados por mim

Criados: `Enums/TipoAlertaSlaEnum.cs`, `Models/AlertaSla.cs`, `Data/DataSeeder.cs`, `Services/SlaOptions.cs`, `Services/SlaMonitorService.cs`, `DTOs/RelatorioDtos.cs`, `DTOs/AlertaSlaDtos.cs`, `Migrations/20260908230311_AdicionarAlertasSla.cs` (+ `.Designer.cs`).
Alterados: `Models/Chamado.cs` (3 propriedades + navegação), `Data/AppDbContext.cs`, `Migrations/AppDbContextModelSnapshot.cs`, `Services/RelatorioService.cs` (reescrito), `Controllers/RelatoriosController.cs` (reescrito), `Program.cs` (3 linhas de DI + 1 chamada de seed), `appsettings.json` (seção `Sla`).
