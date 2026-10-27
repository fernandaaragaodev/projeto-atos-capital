# Deploy — Atos Capital (Helpdesk)

Guia de implantação do sistema de chamados: como o ambiente de produção está montado, como publicar uma nova versão, quais variáveis a API precisa e como administrar as senhas iniciais.

> Nenhum segredo fica neste arquivo. Chaves, senhas e strings de conexão vivem apenas nas variáveis de ambiente do Coolify.

## 1. Visão geral

| Item | Produção |
|---|---|
| Plataforma | Coolify (`coolify.zenixcode.cloud`), projeto **ZenixCode**, ambiente `production`, servidor `localhost` |
| Frontend | `https://atos.zenixcode.cloud` — React/Vite servido por nginx (Dockerfile em `frontend/`) |
| API | `https://api.atos.zenixcode.cloud` — ASP.NET Core .NET 10 (Dockerfile em `backend/`, porta interna 8080) |
| Banco | `atos-postgres` (postgres:16-alpine), banco `atos_support_db`, **sem porta pública** — só acessível pela rede interna do Coolify |
| Anexos | volume `atos-api-uploads` montado em `/app/uploads` na API |
| DNS | curinga `*.zenixcode.cloud` na Cloudflare apontando para o servidor |

Os três recursos ficam na mesma rede Docker do Coolify. A API fala com o banco pelo nome interno do container, informado na variável `ConnectionStrings__DefaultConnection`.

## 2. Fluxo de branches e publicação

O repositório de origem é `fernandaaragaodev/projeto-atos-capital` (branch `main`). O Coolify **não** lê dele: ele lê o fork `s1ntos/projeto-atos-capital`, branch **`deploy/coolify`**, que é `main` mais os Dockerfiles e ajustes de infraestrutura.

Para publicar uma mudança:

```bash
git fetch --all
git checkout deploy/coolify
git merge origin/main          # ou a branch de feature já revisada
git push fork deploy/coolify
```

Depois, no Coolify, abra cada aplicação alterada (`atos-capital-api` e/ou `atos-capital-frontend`) e clique em **Deploy**. Não há webhook automático: o GitHub App da instância cobre só a organização ZenixCode-Team, então o deploy é manual.

Regras:

- Trabalho novo nasce de `origin/main`, vai para o fork e entra em `main` por Pull Request.
- `deploy/coolify` só recebe merge, nunca commits de feature diretos.
- Antes de publicar, rode os testes da API e o build do front (seção 7).

## 3. O que acontece na subida da API

Ao iniciar, `Program.cs` executa, nesta ordem:

1. `Database.Migrate()` — aplica migrations pendentes. Não é preciso rodar migration à mão.
2. Garante os grupos de empresa `Atos Capital` e `Cliente Nortec`.
3. **Saneamento de senhas**: qualquer `SenhaHash` que não esteja no formato de hash (resquício de seeds antigos que gravavam a senha em texto puro) é zerado. O usuário fica só com acesso via SSO até receber uma senha nova.
4. **Usuários de teste** (`admin@atos.com`, `cliente@atos.com`, `agente@atos.com`, `supervisor@atos.com`, `cliente@nortec.com`): criados apenas se `Seed__UsuariosDeTeste=true`. Quem já existe e está sem senha recebe a senha de `Seed__SenhaUsuariosDeTeste`.
5. **Admin inicial**: se `Seed__AdminEmail` e `Seed__AdminSenha` estiverem definidos, cria o usuário ADMIN (ou define a senha dele, se existir sem senha).
6. Regras de SLA padrão.

O seed **nunca sobrescreve uma senha já definida**. Para trocar uma senha pelo seed é preciso antes zerar o hash no banco (seção 6).

## 4. Variáveis de ambiente

### API (`atos-capital-api`)

As chaves usam `__` como separador de seção, no padrão do ASP.NET Core.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | sim | `Production`. Desliga o Swagger e o seed de usuários de teste do `appsettings.Development.json`. |
| `ConnectionStrings__DefaultConnection` | sim | String Npgsql apontando para o container do Postgres na rede interna. |
| `Jwt__Key` | sim | Chave de assinatura dos tokens da API. Gerar aleatória, nunca usar a do `appsettings.json`. Trocar invalida todas as sessões. |
| `Cors__OrigensPermitidas__0` | sim | `https://atos.zenixcode.cloud`. Sem isso o front não consegue chamar a API. |
| `Anexos__Diretorio` | sim | `/app/uploads` (mesmo caminho do volume). |
| `Webhooks__Habilitado` | não | `false` em produção enquanto não houver n8n. |
| `ForwardedHeaders__Habilitado` | sim | `true`. A API está atrás do proxy do Coolify; sem isso o rate limit do login enxerga o IP do proxy em vez do IP do cliente. |
| `Auth__Login__MaxTentativasPorJanela` | não | Tentativas de login aceitas por IP na janela (padrão 10). |
| `Auth__Login__JanelaSegundos` | não | Tamanho da janela do rate limit (padrão 60). |
| `Seed__AdminEmail` / `Seed__AdminNome` / `Seed__AdminSenha` | recomendada | Admin inicial. Senha com 8 a 128 caracteres. |
| `Seed__UsuariosDeTeste` / `Seed__SenhaUsuariosDeTeste` | não | Cria e dá senha aos usuários de demonstração. Deixar `false` quando o sistema sair da fase de testes. |
| `Sso__Key` / `Sso__Issuer` / `Sso__Audience` | quando houver SSO | Segredo compartilhado com o portal Atos Capital que assina o token de SSO. Sem `Sso__Key` o endpoint `/api/Auth/sso` recusa tudo. |

### Frontend (`atos-capital-frontend`)

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL pública da API. É lida **em tempo de build** (ARG do Dockerfile, com default `https://api.atos.zenixcode.cloud`). Mudou a URL, precisa rebuildar. |

### Dicas do Coolify

- A lista de variáveis pagina de **10 em 10**. Com mais de 10 variáveis, as últimas ficam na página 2. O botão **Developer View** mostra todas de uma vez.
- Alterar variável não reinicia a aplicação: é preciso clicar em **Deploy** (ou Restart) depois de salvar.

## 5. Checklist de uma publicação

1. Testes e build passando localmente (seção 7).
2. `deploy/coolify` atualizada e enviada ao fork.
3. Variáveis novas cadastradas no Coolify **antes** do deploy (a API falha na subida se uma seção obrigatória estiver inválida, por exemplo senha de seed com menos de 8 caracteres).
4. Deploy da API; aguardar o status ficar `Running` e o log de deploy terminar sem erro.
5. Deploy do frontend, se houve mudança em `frontend/`.
6. Verificação rápida:

```bash
# API no ar e login com credencial inválida respondendo 401 com a mensagem padrão
curl -s -H 'Content-Type: application/json' -X POST https://api.atos.zenixcode.cloud/api/Auth/login \
  -d '{"email":"naoexiste@atos.com","senha":"x"}'
# -> "E-mail ou senha inválidos."

# Front servindo o bundle novo
curl -s https://atos.zenixcode.cloud/ | grep -o 'assets/index-[^"]*\.js'
```

7. Entrar pela tela `https://atos.zenixcode.cloud/login` com o admin e abrir a fila de chamados.

## 6. Senhas e acesso

### Como o login funciona

- `POST /api/Auth/login` recebe `email` e `senha`. O e-mail é normalizado (espaços e maiúsculas ignorados).
- Senha errada, e-mail inexistente e usuário sem senha recebem a **mesma** resposta 401 (`E-mail ou senha inválidos.`), para não revelar quais e-mails existem.
- Mais de 10 tentativas por minuto do mesmo IP respondem **429**.
- Hash de senha: PBKDF2 (PasswordHasher do ASP.NET Core). O hash nunca sai da API.
- Usuários criados pelo SSO do portal nascem sem senha e só entram por `/sso`.

### Definir ou trocar a senha de um usuário

Ainda não existe troca de senha pela interface (fica para a próxima etapa). Hoje há dois caminhos:

**a) Pelo seed (só para quem está sem senha)** — ajuste `Seed__AdminSenha` ou `Seed__SenhaUsuariosDeTeste` no Coolify e faça o deploy. Só tem efeito se o `SenhaHash` do usuário estiver vazio.

**b) Zerando o hash e deixando o seed agir** — no Coolify, abra **Terminal**, escolha o container do `atos-postgres` e rode:

```bash
psql -U atos_user -d atos_support_db -c "UPDATE \"Usuarios\" SET \"SenhaHash\" = '' WHERE \"Email\" = 'usuario@dominio.com';"
```

Em seguida, deploy da API com a variável de seed desejada. Esse caminho serve para os cinco usuários cobertos pelo seed. Para outros usuários, gere o hash com a própria API (ambiente local) e grave com o mesmo `UPDATE`, trocando `''` pelo hash.

Consulta útil para conferir quem tem senha:

```bash
psql -U atos_user -d atos_support_db -Atc "select \"Id\", \"Email\", (\"SenhaHash\" <> '') as tem_senha from \"Usuarios\" order by \"Id\""
```

### Boas práticas

- Troque a chave `Jwt__Key` e as senhas de seed assim que o sistema sair de demonstração.
- Deixe `Seed__UsuariosDeTeste=false` quando os usuários reais existirem, para o seed parar de recriar contas de teste.
- Não reaproveite as senhas de `appsettings.Development.json` em produção.

## 7. Ambiente local

Pré-requisitos: .NET SDK 10, Node 22, PostgreSQL (o `docker-compose.yml` sobe um na porta 5433 com usuário `atos_user`, senha `atos_password`, banco `atos_support_db`, que é o que o `appsettings.json` espera).

```bash
# API (http://localhost:5170, Swagger em /swagger)
cd backend
dotnet run --launch-profile http

# Testes de regressão (usam SQLite em memória, não precisam de Postgres)
dotnet test Tests/backend.Tests/backend.Tests.csproj

# Frontend (http://localhost:5173, VITE_API_URL em frontend/.env)
cd frontend
npm ci
npm run dev
npm run build     # tsc + vite build, use antes de publicar
```

Em desenvolvimento o `appsettings.Development.json` liga `Seed:UsuariosDeTeste` com a senha local `Atos@Dev2026` para os cinco usuários de teste. Essa senha vale só para o banco local.

## 8. Problemas conhecidos

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Front mostra "Não foi possível conectar ao servidor" | `Cors__OrigensPermitidas__0` ausente ou `VITE_API_URL` errado | Conferir as duas variáveis; o front precisa de rebuild se `VITE_API_URL` mudou |
| API não sobe após deploy, log fala em `Seed:` | Senha de seed com menos de 8 caracteres ou `Seed__AdminEmail` vazio com `Seed__AdminSenha` preenchido | Corrigir a variável e redeployar |
| Todos os usuários recebem 429 ao mesmo tempo | `ForwardedHeaders__Habilitado` em `false`, todo mundo conta como o IP do proxy | Definir `true` e redeployar |
| Usuário "não consegue entrar" mas o e-mail existe | `SenhaHash` vazio (usuário veio do SSO ou foi saneado) | Definir senha conforme a seção 6 |
| Modais do Coolify não abrem (Add Variable, Deploy) | Problema de interface da versão 4.3.x em alguns navegadores | Usar o Developer View para variáveis e o botão Deploy na página principal da aplicação |
