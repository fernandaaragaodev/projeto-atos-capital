# Relatório — Bússola (Chamados API: RF04, RF02, RF12)

Data: 2026-09-08 · Branch: `feat/rf-backend` · Nada foi commitado (o maestro commita).

## Arquivos tocados (todos dentro da minha propriedade)
| Arquivo | Ação |
|---|---|
| `backend/Controllers/ChamadosController.cs` | reescrito |
| `backend/Models/Chamado.cs` | **só métodos**: `AlterarStatus` (limpa `AguardandoDesde` ao sair de AGUARDANDO_CLIENTE e `ResolvidoEm` ao reabrir), `TransicaoPermitida`, `PodeTransicionarPara`, `EhStatusFinal`, `SlaEstourado`, `CalcularSlaEmRisco`/`CalcularSlaEstourado` (estáticos, usados nas projeções; `EstaProximoDeEstourarSLA` passou a delegar para o estático). As colunas de alerta da Ampulheta foram preservadas. |
| `backend/DTOs/RespostaChamadoDto.cs` | + `SlaCategoriaId`, `AguardandoDesde`, `ResolvidoEm`, `FechadoEm` (compatível: só campos novos) |
| `backend/DTOs/AlterarStatusChamadoDto.cs` | novo — `{ Status, Comentario? }` |
| `backend/DTOs/ChamadoDetalheDto.cs` | novo — `ChamadoDetalheDto` + `UsuarioChamadoDto`, `AgenteChamadoDto`, `GrupoEmpresaChamadoDto`, `SlaCategoriaChamadoDto`, `AutorInteracaoDto`, `InteracaoChamadoDto`, `LogAuditoriaChamadoDto` |
| `backend/DTOs/ChamadoResumoDto.cs` | novo — `ChamadoResumoDto` (item da lista) + `PaginaChamadosDto` (envelope paginado) |

Não criei migrations, não editei `Events/`, `RelatorioService`, `Program.cs`, `AuthService`/`AuthController`.

## Endpoints

### RF04 — `PATCH /api/Chamados/{id}/status`
Body `{ "status": StatusEnum, "comentario": "opcional" }` → **200** `RespostaChamadoDto`.
- Máquina de estados em `Chamado.TransicaoPermitida`: ABERTO→EM_ANDAMENTO|AGUARDANDO_CLIENTE|RESOLVIDO; EM_ANDAMENTO→AGUARDANDO_CLIENTE|RESOLVIDO; AGUARDANDO_CLIENTE→EM_ANDAMENTO|RESOLVIDO; RESOLVIDO→FECHADO|EM_ANDAMENTO (reabrir); FECHADO terminal.
- Respostas: 400 status fora do enum · 404 inexistente · 403 cliente de outro grupo / agente em chamado de outro agente / cliente fora das transições permitidas · **409** chamado FECHADO, mesmo status, ou transição inválida.
- Papéis: CLIENTE só RESOLVIDO→FECHADO e AGUARDANDO_CLIENTE→EM_ANDAMENTO no próprio grupo; AGENTE só em chamados dele ou sem agente; SUPERVISOR/ADMIN tudo.
- Grava `LogAuditoria` (ALTERAR_STATUS / Status / anterior→novo); com `comentario` cria `Interacao` PUBLICA.
- Eventos: `chamado.status_alterado` sempre; `chamado.resolvido` / `chamado.fechado` quando for o caso; `interacao.criada` se houve comentário.

### RF02 — `GET /api/Chamados/{id}` e `GET /api/Chamados/codigo/{codigoPublico}`
Mesma lógica (`ObterDetalhe`), projeção única com `Select` + `AsNoTracking` (sem N+1, sem ciclos, sem `SenhaHash`).
Retorna `ChamadoDetalheDto`: dados do chamado, `usuario {id,nome,email}`, `agente {id,nome}?`, `grupoEmpresa {id,nome}`, `slaCategoria?`, `slaEmRisco`, `slaEstourado`, `interacoes[]` (ordem `CriadoEm`, com `autor {id,nome,papel}`, `tipo`, `mensagem`, `anexos`, `criadoEm`) e `logsAuditoria[]` (ordem `Data`, com `usuarioNome`).
- CLIENTE: 403 se de outro grupo; não recebe NOTA_INTERNA (filtro `Tipo == PUBLICA`, equivalente a `EhVisivelAoCliente`) nem `logsAuditoria` (lista vazia).
- 404 se não existir (id ou código).

### RF12 — controle de acesso por papel (controller inteiro)
- **Helper** `ObterUsuarioLogado()` → record `UsuarioLogado(Id, Papel, GrupoEmpresaId)` lido uma vez, tolerante (NameIdentifier|sub, Role|papel com default CLIENTE, GrupoEmpresaId|grupo_empresa_id). Sem Id válido → 401. Helpers `PodeVisualizar` (cliente só no próprio grupo) e `AgentePodeAtuar` (agente só em chamado dele ou sem agente).
- **`GET /api/Chamados`** → `PaginaChamadosDto { itens[], page, pageSize, total, totalPaginas }`. Query opcional: `status`, `prioridade`, `agenteId`, `page` (default 1), `pageSize` (default 20, máx 100 — valores acima são limitados). CLIENTE: só o grupo dele; AGENTE: atribuídos a ele + sem agente; SUPERVISOR/ADMIN: tudo. Itens são `ChamadoResumoDto` (nomes de usuário/agente/grupo, `quantidadeInteracoes` — cliente não conta notas internas — e flags de SLA). **Corrigido o vazamento de `SenhaHash`** (antes devolvia a entidade com Includes). Ordenação: `CriadoEm` desc.
- **`PATCH {id}/atribuir`** (body: `int agenteId`, Roles equipe): AGENTE só a si mesmo e só em chamado sem agente ou já dele (403); SUPERVISOR/ADMIN a qualquer AGENTE; 400 se o id não é AGENTE; 409 se chamado FECHADO. Audita `ATRIBUIR_AGENTE` e, como `AtribuirAgente` move para EM_ANDAMENTO, também `ALTERAR_STATUS` quando o status de fato mudou. Publica `chamado.agente_atribuido` (+ `chamado.status_alterado` se mudou). Agora retorna **200 com `RespostaChamadoDto`** (antes 204).
- **`POST {id}/interacoes`**: CLIENTE só no próprio grupo (403) e só PUBLICA (403 se NOTA_INTERNA); AGENTE só em chamado dele/sem agente; equipe pode NOTA_INTERNA; 400 mensagem vazia/tipo inválido; 409 chamado FECHADO. Retorna `InteracaoChamadoDto` (não a entidade). Publica `interacao.criada`.
  - **`AguardandoDesde` corrigido**: equipe respondendo PUBLICA em chamado ABERTO/EM_ANDAMENTO → chamado vai para AGUARDANDO_CLIENTE (seta `AguardandoDesde`); CLIENTE respondendo em AGUARDANDO_CLIENTE → EM_ANDAMENTO e `AguardandoDesde = null`; NOTA_INTERNA nunca altera status. Cada mudança gera log `ALTERAR_STATUS` + evento `chamado.status_alterado`.
- **`POST /api/Chamados`**: validação de campos obrigatórios (400), publica `chamado.criado` e `chamado.agente_atribuido` (Automatico=true) após `SaveChanges`; `201 Created` com `Location: /api/Chamados/{id}` e `RespostaChamadoDto` (não mais a entidade). Atribuição automática agora é determinística (`OrderBy(Id)`).
- `[Authorize(Roles = "AGENTE,SUPERVISOR,ADMIN,Agente,Supervisor,Admin")]` mantido no mesmo formato (constante `RolesEquipe`).

## Payloads de evento
Objetos anônimos só com ids, código público, status, prioridade, datas e nomes de agente. Nunca `SenhaHash`/token. Em `interacao.criada`, a `mensagem` só vai quando a interação é PUBLICA (nota interna não sai para webhooks externos).

## Validação executada
- `dotnet build -nologo -v q`: 0 erros, 0 warnings.
- `dotnet run` + curl com admin@atos.com, cliente@atos.com e usuários extras semeados **só no banco local** via psql (agente@atos.com, agente2@atos.com, cliente2@atos.com em um segundo grupo, uma regra `SLACategorias` ERP/Financeiro/ALTA). Cobertos: 201/400 na criação; listagem por papel, filtros, paginação/clamp, ausência de `senhaHash`; detalhe por id e por código, 403 de outro grupo, 404, cliente sem notas internas/logs; interações (403 cliente NOTA_INTERNA, 403 outro grupo, 403 agente em chamado de outro agente, transições de `AguardandoDesde`); status (403 por papel, 409 mesmo status/transição inválida/FECHADO, reabertura limpa `ResolvidoEm`, fechamento pelo cliente); atribuição (403 agente para outro, 400 não-agente, 409 fechado).
- Eventos verificados com `Logging__LogLevel__backend.Events=Debug` (o `EventoService` real da Estafeta já está registrado): para um chamado completo foram enfileirados, em ordem, `chamado.criado, chamado.agente_atribuido, chamado.status_alterado, interacao.criada, chamado.status_alterado, chamado.status_alterado, chamado.resolvido, interacao.criada, chamado.status_alterado, chamado.fechado`.

## Decisões que merecem revisão do maestro
1. **Resposta pública da equipe move o chamado para AGUARDANDO_CLIENTE automaticamente** (interpretação de "em chamado que vai para AGUARDANDO_CLIENTE"). Se a preferência for mover só via PATCH status, basta remover o `if (usuario.EhEquipe ...)` em `AdicionarInteracao`.
2. **AGENTE pode ler qualquer chamado** em `GET {id}`/`codigo` (a role só restringe CLIENTE na leitura); a listagem e as mutações seguem a regra "dele ou sem agente".
3. Interação/atribuição em chamado **FECHADO retorna 409** (terminal) — não estava explícito na role.
4. Atuar em chamado sem agente (interagir/alterar status) **não atribui o agente automaticamente**. Pode ser desejável auto-atribuir; não fiz para não extrapolar o escopo.
5. Ordem das validações no PATCH status: transição inválida (409) é checada antes da regra de papel (403). Ex.: cliente pedindo EM_ANDAMENTO→FECHADO recebe 409, não 403.
6. `/atribuir` passou de 204 para 200 com DTO, e `GET /api/Chamados` passou de array para envelope paginado. O frontend atual usa mocks, então nada quebra hoje.

## Pendências / dívidas registradas (fora do meu escopo)
- **Login sem senha** (`AuthController`/`AuthService` autenticam só por e-mail; `SenhaHash` é texto puro no seed). Não alterei conforme instrução.
- `WebhookDispatcher` (Estafeta) entrega em série com retries de até 7 tentativas: com o destino fora do ar (n8n em 5678 não está rodando), a fila acumula e eventos posteriores demoram minutos para aparecer no log. Vale um aviso para a Estafeta (entrega paralela por evento ou circuit breaker).
- `Chamado.Interacoes` do cliente na listagem conta só PUBLICA; se a Ampulheta/relatórios precisarem do total bruto, usar a entidade.
- Não há projeto de testes; a validação foi manual (script de curl em scratchpad, não versionado).
