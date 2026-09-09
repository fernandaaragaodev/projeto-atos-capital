# Relatório — Estafeta (Eventos & Anexos: RF06, RF11)

Data: 2026-09-08 · Branch: `feat/rf-backend` · Nada foi commitado (o maestro commita).

## Arquivos tocados (todos dentro da minha propriedade)
| Arquivo | Ação |
|---|---|
| `backend/Events/EventoServiceNoop.cs` | **removido** (substituído pelo real) |
| `backend/Events/EventoService.cs` | novo — `IEventoService` real: monta envelope e enfileira no Channel |
| `backend/Events/EventoEnvelope.cs` | novo — record `{ Id, Tipo, ChamadoId, OcorridoEm, Payload }` |
| `backend/Events/WebhookDispatcher.cs` | novo — `BackgroundService` que consome o canal e faz POST com retry + HMAC |
| `backend/Events/WebhooksOptions.cs` | novo — `WebhooksOptions` / `WebhookDestino` (seção `Webhooks`) |
| `backend/Events/EventosServiceCollectionExtensions.cs` | novo — `AddEventosWebhooks(config)` (Channel singleton, IEventoService, HttpClient nomeado, HostedService) |
| `backend/Controllers/WebhooksController.cs` | novo — `GET /api/Webhooks/destinos`, `POST /api/Webhooks/testar` (ADMIN) |
| `backend/Services/ArquivoService.cs` | novo — `AnexosOptions`, `AnexoInfo`, `ArquivoService`, `AddAnexos(config)` |
| `backend/Controllers/AnexosController.cs` | novo — upload / listagem / download de anexos |
| `backend/Program.cs` | **só 2 linhas**: a linha do `EventoServiceNoop` virou `AddEventosWebhooks(...)` + `AddAnexos(...)` |
| `backend/appsettings.json` | + seções `Webhooks` e `Anexos` (as demais seções foram preservadas) |

Não criei migrations, não editei `ChamadosController.cs` nem `RelatorioService.cs`. Não há static files da pasta de uploads.

Validação: `dotnet build` sem erros/warnings; `dotnet run` numa porta própria (5199) com um receptor HTTP local em Python validando o HMAC; todos os cenários abaixo testados com curl.

---

## RF06 — Webhooks

### Arquitetura
1. Produtores (Bússola nos endpoints de chamado, Ampulheta no monitor de SLA, eu no upload) chamam `IEventoService.PublicarAsync(tipo, chamadoId, payload)`.
2. `EventoService` serializa o **payload imediatamente** para `JsonElement` (camelCase, `IgnoreCycles`, ignora nulos) — assim o envelope não depende de entidades EF nem do escopo da requisição depois que ela terminou — e escreve num `Channel<EventoEnvelope>` singleton (bounded, capacidade `Webhooks:CapacidadeFila`, default 10 000, backpressure `Wait`). Nunca lança para o chamador por causa de webhook; se o canal estiver fechado (shutdown) loga e descarta.
3. `WebhookDispatcher` (`BackgroundService`) lê o canal, filtra os destinos inscritos no tipo (`Eventos: ["*"]` ou lista), serializa o envelope **uma vez** em bytes e dispara uma entrega por destino, com até `MaxEntregasSimultaneas` (default 8) em paralelo. Um destino lento não trava os outros.
4. Cada entrega: `POST` JSON via `IHttpClientFactory` (client nomeado `webhooks`, timeout `Webhooks:TimeoutSegundos`, default 10 s). Sucesso = 2xx. Falha de rede, timeout, 5xx, 408 e 429 → retry exponencial; outros 4xx → desiste na hora (erro de configuração do destino, repetir não ajuda).
5. Retry: **1 tentativa + 3 retentativas** com esperas `1s, 4s, 16s` (`Webhooks:RetryDelaysSegundos`; se omitido usa esse default). Total máximo ≈ 21 s + 4×timeout por destino.
6. Log via `ILogger`: `Information` em sucesso, `Warning` a cada tentativa falha, `Error` na falha definitiva. Nada derruba a API — o destino n8n do appsettings **não está rodando** e a falha aparece apenas nos logs, como pedido.
7. No shutdown o dispatcher espera até 5 s as entregas em andamento.

`IEventoService` está registrado como **singleton** (só depende do canal + logger), então pode ser injetado tanto em controllers quanto em `BackgroundService`s (Ampulheta) sem criar escopo.

### Configuração (`appsettings.json`)
```json
"Webhooks": {
  "Habilitado": true,
  "TimeoutSegundos": 10,
  "RetryDelaysSegundos": [1, 4, 16],
  "CapacidadeFila": 10000,
  "MaxEntregasSimultaneas": 8,
  "Destinos": [
    {
      "Nome": "n8n-local",
      "Url": "http://localhost:5678/webhook/atos-chamados",
      "Segredo": "troque-este-segredo-no-ambiente",
      "Eventos": ["*"],
      "Ativo": true
    }
  ]
}
```
- `Eventos` omitido/vazio equivale a `["*"]`. `Segredo` opcional: sem ele o header `X-Atos-Signature` não é enviado.
- Em produção sobrescreva o segredo por variável de ambiente: `Webhooks__Destinos__0__Segredo=...`.
- Decisão técnica: as propriedades de coleção (`RetryDelaysSegundos`, `Eventos`) **não têm default no inicializador** de propósito. O binder do .NET concatena defaults de coleção com o appsettings (um `["*"]` default + `["chamado.criado"]` no JSON viraria `["*","chamado.criado"]` e aceitaria tudo). Os defaults são aplicados em `RetryDelaysEfetivos` / `EventosEfetivos`. Detectei isso nos testes e corrigi.

### Formato do envelope (corpo do POST, `Content-Type: application/json; charset=utf-8`)
```json
{
  "id": "9bb16a10-c71e-47ff-9839-7657795db2a8",
  "tipo": "chamado.criado",
  "chamadoId": 11,
  "ocorridoEm": "2026-09-08T23:19:35.0703390Z",
  "payload": { "...": "objeto passado em PublicarAsync, em camelCase" }
}
```
- `id`: Guid único da entrega (mesmo valor em todas as tentativas → o receptor pode deduplicar).
- `chamadoId` é omitido quando nulo (ex.: `webhook.teste`).
- `tipo`: uma das constantes de `TiposEvento` (`chamado.criado`, `chamado.status_alterado`, `chamado.agente_atribuido`, `chamado.resolvido`, `chamado.fechado`, `interacao.criada`, `anexo.adicionado`, `sla.em_risco`, `sla.estourado`) ou `webhook.teste`.

Headers enviados:
| Header | Valor |
|---|---|
| `X-Atos-Event` | `tipo` do envelope |
| `X-Atos-Delivery` | `id` do envelope |
| `X-Atos-Timestamp` | `ocorridoEm` em ISO-8601 (round-trip) |
| `X-Atos-Signature` | HMAC-SHA256 do **corpo bruto** com o `Segredo`, em hexadecimal minúsculo (só se houver segredo) |
| `User-Agent` | `AtosCapital-Chamados-Webhook/1.0` |

### Como validar a assinatura no receptor
Calcule `HMAC-SHA256(segredo, bytes exatos do corpo)` e compare em tempo constante com `X-Atos-Signature`. **Não** re-serialize o JSON antes de assinar — use os bytes recebidos.

Node (n8n Function / Express):
```js
const crypto = require('crypto');
const esperado = crypto.createHmac('sha256', process.env.ATOS_WEBHOOK_SEGREDO).update(rawBody).digest('hex');
const ok = crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(req.headers['x-atos-signature'] || ''));
```
Python:
```python
import hmac, hashlib
esperado = hmac.new(segredo.encode(), raw_body, hashlib.sha256).hexdigest()
ok = hmac.compare_digest(esperado, headers.get("X-Atos-Signature", ""))
```
Shell (para conferir manualmente um corpo salvo em `corpo.json`):
```sh
openssl dgst -sha256 -hmac 'troque-este-segredo-no-ambiente' corpo.json
```
Recomendações ao receptor: rejeitar se a assinatura não bater, deduplicar por `X-Atos-Delivery`, e opcionalmente rejeitar `X-Atos-Timestamp` muito antigo (replay).

### Endpoints (ADMIN)
- `GET /api/Webhooks/destinos` → 200 `{ habilitado, timeoutSegundos, retryDelaysSegundos, destinos: [{ nome, url, eventos, ativo, possuiSegredo }] }`. O segredo **nunca** é retornado. CLIENTE → 403; sem token → 401.
- `POST /api/Webhooks/testar` body opcional `{ "mensagem": "..." }` → **202** `{ tipo: "webhook.teste", enfileiradoEm, destinosInscritos, observacao }`. Payload publicado: `{ mensagem, solicitadoPorUsuarioId, solicitadoEm }`. O resultado da entrega é assíncrono e sai nos logs do `WebhookDispatcher`.

### Evidência dos testes
Receptor local com segredo: `webhook.teste`, `chamado.criado` (publicado pelo endpoint da Bússola) e `anexo.adicionado` chegaram com `sig_ok=True` e envelope no formato acima. Destino que responde 500 e destino com porta fechada: 4 tentativas cada, logs de warning por tentativa e erro final, API seguiu respondendo normalmente.

---

## RF11 — Anexos

### Modelo (sem migration)
`Interacao.Anexos` (já era `string?`) passa a guardar um **JSON array** de `AnexoInfo`:
```json
[{ "nomeOriginal": "doc.pdf", "nomeArmazenado": "04addbb7bad043758275f54f7cb83228.pdf",
   "contentType": "application/pdf", "tamanhoBytes": 28,
   "url": "/api/Chamados/11/anexos/04addbb7bad043758275f54f7cb83228.pdf" }]
```
`ArquivoService.Serializar/Desserializar` fazem a (de)serialização; conteúdo legado que não seja JSON array é lido como lista vazia (não quebra). Quem exibir `Interacao.Anexos` no front/DTO de detalhe pode desserializar com esse formato.

### Armazenamento (`ArquivoService`, singleton)
- Diretório `Anexos:Diretorio` (default `uploads`, relativo ao ContentRoot = `backend/uploads`, já no `.gitignore`); criado no startup. Aceita caminho absoluto.
- Nome em disco: `Guid("N") + extensão` (32 hex + ext). Nome original só para exibição, sanitizado (`Path.GetFileName`, remove controles e `"<>|:*?`, máx. 150 chars).
- Validações (todas antes de gravar qualquer arquivo — tudo ou nada): não vazio; ≤ `Anexos:TamanhoMaximoMb` (default 10); extensão na whitelist `.pdf .png .jpg .jpeg .gif .webp .txt .csv .xlsx .docx .zip`; content-type coerente com a extensão (aceita também `application/octet-stream`, que o curl envia por padrão); **assinatura binária** conferida (`%PDF`, PNG, JFIF, GIF8, RIFF/WEBP, `PK` para zip/xlsx/docx; txt/csv sem bytes nulos). Máx. `Anexos:MaxArquivosPorEnvio` (default 10) por requisição.
- O content-type gravado/servido é o **canônico da extensão**, nunca o que o cliente mandou.
- Path traversal: download só aceita nomes no padrão `^[0-9a-f]{32}\.[a-z0-9]{2,5}$` com extensão da whitelist, e ainda confere que o caminho resolvido fica dentro do diretório base. Nada é executado; a pasta não é servida como static files.

### Endpoints (`[Authorize]`, `Controllers/AnexosController.cs`)
Autorização comum: chamado inexistente → 404; CLIENTE de outro `GrupoEmpresaId` → **403**; AGENTE/SUPERVISOR/ADMIN → tudo; CLIENTE só enxerga anexos de interações PUBLICA.

- `POST /api/Chamados/{id}/anexos` — `multipart/form-data`, campo `arquivos` (múltiplo), campo opcional `mensagem`. `[RequestSizeLimit]`/`[RequestFormLimits]` de 105 MB (10 arquivos × 10 MB + folga).
  Cria **uma** `Interacao` PUBLICA do usuário logado (`Mensagem` default `"Anexo(s) enviado(s)"`, `Anexos` = JSON acima), grava `LogAuditoria` (`Acao=ANEXAR_ARQUIVO`, `CampoAlterado=Interacao.Anexos`, `ValorNovo` = lista `nome (nomeArmazenado, bytes)`), publica `anexo.adicionado` com payload `{ chamadoId, codigoPublico, grupoEmpresaId, interacaoId, autorId, mensagem, anexos[] }`.
  → **201** `{ interacaoId, chamadoId, tipo, mensagem, criadoEm, anexos[] }` · 400 `{ mensagem, erros[] }` listando cada arquivo rejeitado · 400 sem arquivos · 401 sem token. Se o `SaveChanges` falhar, os arquivos já gravados são removidos do disco.
- `GET /api/Chamados/{id}/anexos` → 200 `{ chamadoId, total, anexos: [{ interacaoId, tipoInteracao, enviadoEm, autorId, autorNome, nomeOriginal, nomeArmazenado, contentType, tamanhoBytes, url }] }` consolidando todas as interações (ordem cronológica).
- `GET /api/Chamados/{id}/anexos/{nomeArmazenado}` → `FileStreamResult` com content-type canônico, `Content-Disposition: attachment; filename=<nome original>`, `X-Content-Type-Options: nosniff`, range habilitado. Valida que o nome pertence a uma interação **daquele** chamado (nome de outro chamado → 404). CLIENTE pedindo anexo de NOTA_INTERNA → **403** (recurso existe, acesso negado). Nome fora do padrão → 400. Referenciado no banco mas ausente em disco → 404 + warning no log.

### Evidência dos testes (curl)
| Cenário | Resultado |
|---|---|
| Upload de pdf+png+csv com mensagem (CLIENTE do grupo) | 201, interação PUBLICA, auditoria `ANEXAR_ARQUIVO`, evento `anexo.adicionado` entregue |
| Upload sem mensagem (ADMIN) | 201, mensagem `Anexo(s) enviado(s)` |
| `.sh`, `.pdf` falso (texto) e `.txt` de 11 MB no mesmo envio | 400 com os 3 erros, nenhum arquivo gravado |
| Sem arquivos / chamado inexistente / sem token | 400 / 404 / 401 |
| CLIENTE de outro grupo: upload, listar, download | 403 / 403 / 403 |
| Listagem CLIENTE vs ADMIN com nota interna anexada | cliente vê 4, admin vê 5 |
| Download do anexo da nota interna: CLIENTE / ADMIN | 403 / 200 |
| Download normal | 200, `application/pdf`, attachment, bytes idênticos ao original |
| `..%2F..%2Fappsettings.json`, `appsettings.json`, `%2e%2e%2fProgram.cs`, `<nome>%00.txt` | 400 em todos |
| Nome válido de outro chamado / nome válido inexistente | 404 / 404 |

---

## Decisões
- `IEventoService` singleton (era Scoped no no-op) para ser injetável em `BackgroundService`s.
- Payload serializado na publicação, não na entrega (segurança de thread/escopo e assinatura sobre bytes estáveis).
- 4xx (exceto 408/429) não faz retry; 5xx/rede/timeout fazem.
- Interpretação de "3 tentativas: 1s, 4s, 16s": 1 tentativa inicial + 3 retentativas com essas esperas.
- Limite do `[RequestSizeLimit]` é constante em compilação (105 MB); se `Anexos:TamanhoMaximoMb`/`MaxArquivosPorEnvio` forem aumentados muito acima dos defaults, ajustar a constante `LimiteRequisicaoBytes` no controller.
- DTOs do upload ficam dentro dos meus arquivos (`EnviarAnexosForm` no controller, `AnexoInfo` no service) para não tocar em `DTOs/` de outros donos.

## Pendências / sugestões
- **Segredo do n8n** em `appsettings.json` é placeholder; definir por variável de ambiente no deploy.
- Não há persistência da fila: eventos em memória se perdem se a API cair antes da entrega (aceitável para este escopo; se precisar de garantia, tabela `outbox` — precisa de migration da Ampulheta).
- Não há endpoint de **remoção** de anexo (não estava no escopo).
- O `POST /api/Chamados/{id}/interacoes` da Bússola ainda aceita `Anexos` como string livre; sugiro que o front use apenas o endpoint de upload para anexos, ou que a Bússola valide/ignore esse campo.
- Se o front precisar dos anexos já desserializados dentro de `GET /api/Chamados/{id}` (RF02), a Bússola pode chamar `ArquivoService.Desserializar(i.Anexos)` na projeção.
- Dados de teste deixados no banco: chamado `ATOS-20260908-391E` (id 11) com 2 interações de anexo apontando para arquivos que estavam num diretório temporário (o download deles retornará 404). Pode ser apagado.
