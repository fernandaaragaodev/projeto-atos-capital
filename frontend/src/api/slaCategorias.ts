import { request } from './client';
import { prioridadeFromApi, prioridadeToApi } from './mappers';
import type { SalvarSlaCategoria, SlaCategoriaRegra as ApiSlaCategoriaRegra } from './types';
import type { Prioridade } from '@/types/chamado';

/** Regra de SLA no modelo do front (prioridade como texto, id como string). */
export interface SlaCategoriaRegra {
  id: string;
  produto: string;
  categoria: string;
  prioridade: Prioridade;
  tempoRespostaHoras: number;
  tempoResolucaoHoras: number;
  chamadosVinculados: number;
}

export type SlaCategoriaValores = Omit<SlaCategoriaRegra, 'id' | 'chamadosVinculados'>;

function regraFromApi(dto: ApiSlaCategoriaRegra): SlaCategoriaRegra {
  return {
    id: String(dto.id),
    produto: dto.produto,
    categoria: dto.categoria,
    prioridade: prioridadeFromApi(dto.prioridade),
    tempoRespostaHoras: dto.tempoRespostaHoras,
    tempoResolucaoHoras: dto.tempoResolucaoHoras,
    chamadosVinculados: dto.chamadosVinculados,
  };
}

function regraToApi(valores: SlaCategoriaValores): SalvarSlaCategoria {
  return {
    produto: valores.produto.trim(),
    categoria: valores.categoria.trim(),
    prioridade: prioridadeToApi(valores.prioridade),
    tempoRespostaHoras: valores.tempoRespostaHoras,
    tempoResolucaoHoras: valores.tempoResolucaoHoras,
  };
}

export async function listarRegras(): Promise<SlaCategoriaRegra[]> {
  const regras = await request<ApiSlaCategoriaRegra[]>('/api/SlaCategorias/regras');
  return regras.map(regraFromApi);
}

export async function criar(valores: SlaCategoriaValores): Promise<SlaCategoriaRegra> {
  const dto = await request<ApiSlaCategoriaRegra>('/api/SlaCategorias', { method: 'POST', body: regraToApi(valores) });
  return regraFromApi(dto);
}

export async function editar(id: string, valores: SlaCategoriaValores): Promise<SlaCategoriaRegra> {
  const dto = await request<ApiSlaCategoriaRegra>(`/api/SlaCategorias/${id}`, { method: 'PUT', body: regraToApi(valores) });
  return regraFromApi(dto);
}

export function excluir(id: string): Promise<void> {
  return request<void>(`/api/SlaCategorias/${id}`, { method: 'DELETE' });
}
