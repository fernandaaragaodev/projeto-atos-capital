import { apiGet } from './client';

export interface FiltrosRelatorio {
  inicio?: string; // ISO
  fim?: string; // ISO
  grupoEmpresaId?: string;
  produto?: string;
  categoria?: string;
}

function toQuery(filtros: FiltrosRelatorio): string {
  const entries = Object.entries(filtros).filter((entry): entry is [string, string] => Boolean(entry[1]));
  return entries.length ? `?${new URLSearchParams(entries)}` : '';
}

/** GET /relatorios/por-categoria — RF08, painel de chamados mais recorrentes. */
export function porCategoria(filtros: FiltrosRelatorio = {}) {
  return apiGet<Array<{ categoria: string; quantidade: number }>>(`/relatorios/por-categoria${toQuery(filtros)}`);
}

/** GET /relatorios/por-produto */
export function porProduto(filtros: FiltrosRelatorio = {}) {
  return apiGet<Array<{ produto: string; quantidade: number }>>(`/relatorios/por-produto${toQuery(filtros)}`);
}

/** GET /relatorios/por-empresa */
export function porEmpresa(filtros: FiltrosRelatorio = {}) {
  return apiGet<Array<{ grupoEmpresaNome: string; quantidade: number }>>(`/relatorios/por-empresa${toQuery(filtros)}`);
}

/** GET /relatorios/sla — RF09, indicadores de estouro/no prazo. */
export function sla(filtros: FiltrosRelatorio = {}) {
  return apiGet<{ noPrazo: number; estourados: number; percentualDentroSla: number }>(
    `/relatorios/sla${toQuery(filtros)}`,
  );
}

/** GET /relatorios/resumo — indicadores gerais do período filtrado. */
export function resumo(filtros: FiltrosRelatorio = {}) {
  return apiGet<{ total: number }>(`/relatorios/resumo${toQuery(filtros)}`);
}
