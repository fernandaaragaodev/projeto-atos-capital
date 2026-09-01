export type Cliente = {
  id: string
  nome: string
  email: string
  telefone: string | null
  documento: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export type ClienteInput = {
  nome: string
  email: string
  telefone?: string
  documento?: string
  ativo?: boolean
}

export type Paginado<T> = {
  data: T[]
  meta: { pagina: number; por_pagina: number; total: number; total_paginas: number }
}
