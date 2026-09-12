# Atos Bank — Frontend

Implementação do front-end conforme o **Design System Atos Bank**, usando:

- **React 18 + TypeScript + Vite**
- **MUI v5** como biblioteca de componentes
- **Poppins** (400/500/600/700) via Google Fonts
- **Material Icons** (`@mui/icons-material`)

## Como rodar

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## O que está implementado

### Tema
- `src/theme/tokens.ts` — todos os tokens do PDF (`brand.*`, `surface.*`, `border.*`, `text.*`,
  `state.*` / `statusBg.*`, `menu.*`, `table.*`, `scrollbar.*`, tipografia). Fonte única de cor —
  nenhum componente usa hex direto.
- `src/theme/theme.ts` — fábrica de tema MUI (`buildTheme('light' | 'dark')`) que consome os tokens.
- `src/theme/ThemeModeProvider.tsx` — contexto de dark/light mode, persistido em `localStorage`,
  com fallback para `prefers-color-scheme`. Qualquer tela nova funciona nos dois temas de graça,
  desde que toda cor venha do tema.

### Padrão de componente
Todo componente e tela segue a divisão pedida:

```
ComponenteX/
  index.tsx   -> só renderização (JSX)
  useApp.ts   -> estado, efeitos e regra de negócio
```

### Componentes do padrão de tela
- `<Options />` — botão primário à esquerda, busca + ações secundárias à direita
  (recarregar, filtro, colunas, exportar).
- `<ResumeBar />` — cards de totalizadores.
- Chips de filtro (`FilterChips`) — filtros ativos removíveis, alinhados à direita.
- `<TableGrid />` — tabela com paginação, ordenação, seleção opcional e coluna de Ações no fim.
- `<ColumnSelector />` — colunas visíveis persistidas por tela em `localStorage`.
- `<StatusBadge />` — badges de tabela usando o par `state.*` / `statusBg.*`.
- `<LineErrorForm />` + `<RequiredLabel />` — erro exibido sob o campo e asterisco vermelho
  no rótulo (nunca só validação no envio).

### Telas de exemplo
- **Páginas Disponíveis** (`src/pages/PaginasDisponiveis`) — replica o hub de navegação do print
  do Design System (hero com degradê da marca, busca, atalhos recentes, seções por módulo).
- **Títulos a Pagar** (`src/pages/TitulosAPagar`) — tela completa usando todos os componentes do
  padrão juntos: `ResumeBar`, `Options`, `FilterChips`, `TableGrid`, `StatusBadge` e um modal de
  cadastro (`react-hook-form` + `Yup`, erros via `LineErrorForm`).

### Layout
- `src/layouts/MainLayout` — menu lateral com o degradê da marca (`menu.background`), header
  superior com toggle de dark mode, ícones e avatar do usuário — seguindo o print anexado.

### Outros
- **Notificações**: `sonner` (`src/utils/notify.ts`) — nunca o Snackbar do MUI.
- **Datas**: `dayjs` + `@mui/x-date-pickers`, formato `DD/MM/YYYY` (`src/utils/dateConfig.ts`).
- **Idioma**: `i18next` / `react-i18next`, com `pt`, `en`, `es` em `src/i18n/locales`.
- **Formulários**: `react-hook-form` + `Yup`, erro sob o campo via `LineErrorForm`.
- **Logos**: consumidos diretamente de `https://app.atosbank.com.br/brands/atos/logo.svg` e
  `.../favicon.ico`, conforme o Design System.

## Módulo de Chamados (Termo de Referência — Residência de Software)

Telas do MVP descrito no termo, construídas em cima do Design System acima, sem novas
dependências:

- **Fila de chamados** (`src/pages/Chamados`) — RF02, RF07, RF09. `TableGrid` com prioridade e
  status via `StatusBadge`, coluna de SLA com contagem regressiva e alerta visual quando estourado,
  `ResumeBar` com totais, modal de abertura de chamado (`NovoChamadoModal`, RF01/RF11 — anexos
  opcionais).
- **Detalhe do chamado** (`src/pages/ChamadoDetalhe`) — RF02–RF05, RF13. Linha do tempo
  (`Timeline`) separando mensagens públicas de notas internas, formulário para responder ao
  cliente ou registrar nota interna, troca de status e atribuição de agente, e trilha de
  auditoria de cada alteração.
- **Relatórios de SLA** (`src/pages/Relatorios`) — RF08. Filtros por produto/cliente/categoria,
  indicadores de % dentro do SLA e painel de chamados mais recorrentes por categoria.
- **Controle de acesso por papel** (`src/auth`) — RF12. `AuthContext`/`useAuth` simula o usuário
  autenticado (papel: cliente/agente/supervisor/admin); `RoleGuard` bloqueia telas restritas
  (Relatórios exige supervisor ou admin).

Todos os dados hoje são mock (`useApp.ts` de cada tela) — mesma convenção usada em
`TitulosAPagar`. Pontos de integração real, a fazer pelo time de back-end:

- **RF10 (SSO/JWT)**: `src/auth/AuthContext.tsx` documenta onde decodificar/validar o token que o
  portal Atos Capital vai enviar, substituindo o `mockDecodedToken`.
- **RF01/RF02/RF04/RF06**: trocar os `useState` mockados de `Chamados/useApp.ts` e
  `ChamadoDetalhe/useApp.ts` por chamadas à API de chamados (C#), incluindo o consumo do webhook
  de eventos (RF06) para atualizar a fila em tempo real.
- **RF08**: `Relatorios/useApp.ts` hoje agrega os dados mockados no front; migrar a agregação para
  o endpoint de relatórios quando existir, mantendo os mesmos filtros.

## Próximos passos sugeridos

- Conectar `TableGrid`/`Options` a uma API real (hoje os dados são mockados em cada `useApp.ts`).
- Adicionar autenticação e roteamento por módulo (Administrativo, Bank Services, Budget Services,
  Tax Services, Card Services), hoje representados apenas no menu lateral.
- Repetir o padrão de tela (`ResumeBar` + `Options` + `TableGrid`) para as demais páginas do
  portal, reaproveitando os mesmos componentes.

## Referência

Repositório do time: https://github.com/FluixIT/system-atos-squad72 (não foi possível acessá-lo
neste ambiente — protegido por login/robots — então a estrutura abaixo foi montada com base
apenas no PDF do Design System. Vale conferir se os nomes de tela/rota já usados no repo batem
com os aqui propostos).
