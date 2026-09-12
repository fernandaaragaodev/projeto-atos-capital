import { request, toQueryString } from './client';
import type { FiltroRelatorio, ResumoRelatorio, SlaCategorias, TotalPorCategoria, TotalPorGrupoEmpresa, TotalPorProduto } from './types';

function query(filtro: FiltroRelatorio = {}): string {
  return toQueryString({
    dataInicio: filtro.dataInicio,
    dataFim: filtro.dataFim,
    grupoEmpresaId: filtro.grupoEmpresaId,
    agenteId: filtro.agenteId,
    produto: filtro.produto,
  });
}

export function porCategoria(filtro?: FiltroRelatorio): Promise<TotalPorCategoria[]> {
  return request<TotalPorCategoria[]>(`/api/Relatorios/por-categoria${query(filtro)}`);
}

export function porProduto(filtro?: FiltroRelatorio): Promise<TotalPorProduto[]> {
  return request<TotalPorProduto[]>(`/api/Relatorios/por-produto${query(filtro)}`);
}

export function porGrupoEmpresa(filtro?: FiltroRelatorio): Promise<TotalPorGrupoEmpresa[]> {
  return request<TotalPorGrupoEmpresa[]>(`/api/Relatorios/por-grupo-empresa${query(filtro)}`);
}

export function sla(filtro?: FiltroRelatorio): Promise<SlaCategorias> {
  return request<SlaCategorias>(`/api/Relatorios/sla${query(filtro)}`);
}

export function resumo(filtro?: FiltroRelatorio): Promise<ResumoRelatorio> {
  return request<ResumoRelatorio>(`/api/Relatorios/resumo${query(filtro)}`);
}
