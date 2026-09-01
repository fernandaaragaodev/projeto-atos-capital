import type { Cliente, Prisma } from '@prisma/client'
import { naoEncontrado } from '../../lib/errors.js'
import { meta } from '../../lib/pagination.js'
import { clientesRepository } from './clientes.repository.js'
import type { AtualizarClienteBody, ClienteResposta, CriarClienteBody, ListarClientesQuery } from './clientes.schema.js'

function paraResposta(c: Cliente): ClienteResposta {
  return {
    id: c.id,
    nome: c.nome,
    email: c.email,
    telefone: c.telefone,
    documento: c.documento,
    ativo: c.ativo,
    criado_em: c.criadoEm.toISOString(),
    atualizado_em: c.atualizadoEm.toISOString(),
  }
}

export const clientesService = {
  async listar(query: ListarClientesQuery) {
    const where: Prisma.ClienteWhereInput = {
      ...(query.ativo !== undefined && { ativo: query.ativo }),
      ...(query.q && {
        OR: [
          { nome: { contains: query.q, mode: 'insensitive' } },
          { email: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    }
    const skip = (query.pagina - 1) * query.por_pagina
    const [itens, total] = await clientesRepository.listar(where, skip, query.por_pagina)
    return { data: itens.map(paraResposta), meta: meta(query.pagina, query.por_pagina, total) }
  },

  async buscar(id: string) {
    const c = await clientesRepository.buscarPorId(id)
    if (!c) throw naoEncontrado('cliente')
    return paraResposta(c)
  },

  async criar(body: CriarClienteBody) {
    return paraResposta(await clientesRepository.criar(body))
  },

  async atualizar(id: string, body: AtualizarClienteBody) {
    await this.buscar(id)
    return paraResposta(await clientesRepository.atualizar(id, body))
  },

  async remover(id: string) {
    await this.buscar(id)
    await clientesRepository.remover(id)
  },
}
