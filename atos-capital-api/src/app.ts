import Fastify from 'fastify'
import cors from '@fastify/cors'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { env } from './config/env.js'
import { errorHandler } from './lib/error-handler.js'
import { clientesRoutes } from './modules/clientes/clientes.routes.js'

export function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'production' ? true : { transport: { target: 'pino-pretty' } },
    requestIdHeader: 'x-request-id',
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.setErrorHandler(errorHandler)

  app.register(cors, { origin: env.CORS_ORIGIN })

  app.addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', req.id)
  })

  app.get('/health', async () => ({ status: 'ok' }))

  app.register(clientesRoutes, { prefix: '/api/v1/clientes' })

  return app
}
