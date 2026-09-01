import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'
import { AppError } from './errors.js'

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const request_id = request.id

  if (error instanceof AppError) {
    return reply.status(error.status).send({
      erro: { codigo: error.codigo, mensagem: error.message, detalhes: error.detalhes, request_id },
    })
  }

  if (hasZodFastifySchemaValidationErrors(error)) {
    return reply.status(422).send({
      erro: {
        codigo: 'validacao_invalida',
        mensagem: 'Dados inválidos.',
        detalhes: error.validation.map((v) => ({
          campo: v.instancePath.replace(/^\//, '') || String(v.params.issue.path[0] ?? ''),
          mensagem: v.message ?? 'inválido',
        })),
        request_id,
      },
    })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return reply.status(409).send({
      erro: { codigo: 'registro_duplicado', mensagem: 'Já existe um registro com esse valor único.', request_id },
    })
  }

  if (error.statusCode === 400) {
    return reply.status(400).send({
      erro: { codigo: 'requisicao_invalida', mensagem: 'Requisição malformada.', request_id },
    })
  }

  request.log.error(error)
  return reply.status(500).send({
    erro: { codigo: 'erro_interno', mensagem: 'Erro interno. Informe o request_id ao suporte.', request_id },
  })
}
