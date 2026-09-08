# Atos Bank — Frontend

React 18 + TypeScript + Vite · MUI v5 (Design System Atos Bank) · Poppins + Material Icons

## Rodando o projeto

```bash
npm install
npm run dev
```
Abre em `http://localhost:5173`.

## Padrão de componente

```
ComponenteX/
  index.tsx   -> renderização (JSX)
  useApp.ts   -> estado, efeitos, regra de negócio
```

## Peças-chave

- **Tema**: `src/theme/tokens.ts` (todos os tokens do Design System, nada de hex direto no componente) + `theme.ts` (`buildTheme('light'|'dark')`) + `ThemeModeProvider` (persistência em `localStorage`).
- **Componentes de tela**: `Options`, `ResumeBar`, `FilterChips`, `TableGrid`, `ColumnSelector`, `StatusBadge`, `LineErrorForm`/`RequiredLabel` — reaproveitados em toda tela nova.
- **Layout**: `src/layouts/MainLayout` (menu lateral, header, dark mode).
- **Convenções**: notificações via `sonner` (não usar Snackbar do MUI) · datas com `dayjs` no formato `DD/MM/YYYY` · i18n via `i18next` (`pt`/`en`/`es`) · formulários com `react-hook-form` + `Yup`.

## Telas implementadas

- `PaginasDisponiveis` — hub de navegação.
- `TitulosAPagar` — referência completa do padrão de tela.
- `Chamados`, `ChamadoDetalhe`, `Relatorios` — MVP do módulo de chamados (dados mockados em cada `useApp.ts`; integração com API/back-end ainda pendente).
- `src/auth` — controle de acesso por papel (cliente/agente/supervisor/admin).

## Referência

Repositório do time: https://github.com/FluixIT/system-atos-squad72.
