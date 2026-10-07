'use strict'

const { test } = require('node:test')
const diagnostics = require('node:diagnostics_channel')
const Fastify = require('../..')

for (const path of ['handler', 'preHandler']) {
  for (const property of ['statusCode', 'status', undefined]) {
    test(`diagnostics reports ${property || 'default status'} for synchronous ${path} errors`, async (t) => {
      const fastify = Fastify()
      t.after(() => fastify.close())
      const error = new Error('test error')
      if (property) error[property] = 503

      let diagnosticsStatusCode
      const channel = diagnostics.channel('tracing:fastify.request.handler:error')
      const subscriber = (msg) => {
        diagnosticsStatusCode = msg.reply.statusCode
      }
      channel.subscribe(subscriber)
      t.after(() => channel.unsubscribe(subscriber))

      fastify.setErrorHandler((err, request, reply) => {
        reply.code(502).send({ error: err.message })
      })
      const throwError = () => { throw error }
      fastify.get('/', {
        preHandler: path === 'preHandler' ? throwError : undefined
      }, path === 'handler' ? throwError : () => 'ok')

      const res = await fastify.inject('/')
      t.assert.strictEqual(diagnosticsStatusCode, property ? 503 : 500)
      t.assert.strictEqual(res.statusCode, 502)
    })
  }
}
