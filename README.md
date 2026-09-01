# Atos Capital

Sistema de gestão — MVP com CRUD de clientes.

## Estrutura

```
atos-capital-api/        Fastify 5 + TypeScript + Prisma + Postgres + Zod
atos-capital-frontend/   Next.js 16 (App Router) + React 19 + Tailwind 4
docker-compose.yml       Postgres 16 local (porta 5433)
```

## Rodando local

```bash
# 1. banco
docker compose up -d

# 2. API (http://localhost:3333)
cd atos-capital-api
cp .env.example .env
pnpm install
pnpm prisma:migrate      # aplica migrations
pnpm dev

# 3. Frontend (http://localhost:3000)
cd ../atos-capital-frontend
cp .env.example .env.local
pnpm install
pnpm dev
```

## API

Base: `/api/v1`. Padrões: `snake_case`, coleção em `{ data, meta }`, erro em `{ erro: { codigo, mensagem, detalhes?, request_id } }`.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/api/v1/clientes?q=&ativo=&pagina=&por_pagina=` | lista paginada |
| GET | `/api/v1/clientes/:id` | detalhe |
| POST | `/api/v1/clientes` | cria (201 + `Location`) |
| PATCH | `/api/v1/clientes/:id` | atualiza campos parciais |
| DELETE | `/api/v1/clientes/:id` | remove (204) |

Status usados: 200, 201, 204, 400, 404, 409 (e-mail duplicado), 422 (validação), 500.

## Layout do backend

```
src/
  config/env.ts              valida env na subida; não sobe se faltar
  lib/                       prisma, errors, error-handler, pagination
  modules/clientes/
    clientes.routes.ts       HTTP: schema zod + resposta
    clientes.service.ts      regra de negócio + mapeamento p/ snake_case
    clientes.repository.ts   único lugar que fala com o Prisma
    clientes.schema.ts       validação de entrada/saída
```

Novo recurso = nova pasta em `src/modules/` seguindo o mesmo formato e registro em `src/app.ts`.
