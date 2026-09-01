import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { clientesService } from './clientes.service.js'
import {
  atualizarClienteBody,
  clienteResposta,
  criarClienteBody,
  idParams,
  listaClientesResposta,
  listarClientesQuery,
} from './clientes.schema.js'

export async function clientesRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>()

  r.get('/', { schema: { querystring: listarClientesQuery, response: { 200: listaClientesResposta } } }, (req) =>
    clientesService.listar(req.query),
  )

  r.get('/:id', { schema: { params: idParams, response: { 200: clienteResposta } } }, (req) =>
    clientesService.buscar(req.params.id),
  )

  r.post('/', { schema: { body: criarClienteBody, response: { 201: clienteResposta } } }, async (req, reply) => {
    const cliente = await clientesService.criar(req.body)
    return reply.status(201).header('Location', `/api/v1/clientes/${cliente.id}`).send(cliente)
  })

  r.patch(
    '/:id',
    { schema: { params: idParams, body: atualizarClienteBody, response: { 200: clienteResposta } } },
    (req) => clientesService.atualizar(req.params.id, req.body),
  )

  r.delete('/:id', { schema: { params: idParams } }, async (req, reply) => {
    await clientesService.remover(req.params.id)
    return reply.status(204).send()
  })
}
