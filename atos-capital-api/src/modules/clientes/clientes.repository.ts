import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

export const clientesRepository = {
  listar(where: Prisma.ClienteWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.cliente.findMany({ where, skip, take, orderBy: { criadoEm: 'desc' } }),
      prisma.cliente.count({ where }),
    ])
  },
  buscarPorId(id: string) {
    return prisma.cliente.findUnique({ where: { id } })
  },
  criar(data: Prisma.ClienteCreateInput) {
    return prisma.cliente.create({ data })
  },
  atualizar(id: string, data: Prisma.ClienteUpdateInput) {
    return prisma.cliente.update({ where: { id }, data })
  },
  remover(id: string) {
    return prisma.cliente.delete({ where: { id } })
  },
}
