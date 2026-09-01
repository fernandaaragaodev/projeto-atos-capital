import { z } from 'zod'
import { paginacaoQuery } from '../../lib/pagination.js'

export const clienteResposta = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  email: z.string().email(),
  telefone: z.string().nullable(),
  documento: z.string().nullable(),
  ativo: z.boolean(),
  criado_em: z.string().datetime(),
  atualizado_em: z.string().datetime(),
})

export const criarClienteBody = z
  .object({
    nome: z.string().min(2).max(120),
    email: z.string().email().max(160),
    telefone: z.string().regex(/^\d{10,11}$/, 'só dígitos, 10 ou 11').optional(),
    documento: z.string().regex(/^(\d{11}|\d{14})$/, 'CPF (11) ou CNPJ (14), só dígitos').optional(),
    ativo: z.boolean().optional(),
  })
  .strict()

export const atualizarClienteBody = criarClienteBody.partial().strict()

export const listarClientesQuery = paginacaoQuery.extend({
  q: z.string().optional(),
  ativo: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
})

export const idParams = z.object({ id: z.string().uuid() })

export const listaClientesResposta = z.object({
  data: z.array(clienteResposta),
  meta: z.object({ pagina: z.number(), por_pagina: z.number(), total: z.number(), total_paginas: z.number() }),
})

export type CriarClienteBody = z.infer<typeof criarClienteBody>
export type AtualizarClienteBody = z.infer<typeof atualizarClienteBody>
export type ListarClientesQuery = z.infer<typeof listarClientesQuery>
export type ClienteResposta = z.infer<typeof clienteResposta>
