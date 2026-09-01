import { api } from '@/lib/api'
import type { Cliente, ClienteInput, Paginado } from './types'

export const clientesApi = {
  listar: (params: { q?: string; pagina?: number } = {}) => {
    const qs = new URLSearchParams()
    if (params.q) qs.set('q', params.q)
    if (params.pagina) qs.set('pagina', String(params.pagina))
    const s = qs.toString()
    return api<Paginado<Cliente>>(`/api/v1/clientes${s ? `?${s}` : ''}`)
  },
  criar: (body: ClienteInput) => api<Cliente>('/api/v1/clientes', { method: 'POST', body: JSON.stringify(body) }),
  atualizar: (id: string, body: Partial<ClienteInput>) =>
    api<Cliente>(`/api/v1/clientes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remover: (id: string) => api<void>(`/api/v1/clientes/${id}`, { method: 'DELETE' }),
}
