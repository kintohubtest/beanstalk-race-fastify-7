'use strict'

const { test } = require('node:test')
const diagnostics = require('node:diagnostics_channel')
const Fastify = require('../..')

for (const path of ['sync', 'async', 'preHandler']) {
  for (const [property, value, expected] of [
    ['statusCode', 503, 503],
    ['status', 418, 418],
    ['statusCode', 302, 500],
    [undefined, undefined, 500]
  ]) {
    for (const customHandler of [false, true]) {
      test(`${path} error diagnostics status: ${property}=${value}, custom handler=${customHandler}`, async (t) => {
        const fastify = Fastify()
        t.after(() => fastify.close())

        const error = new Error('handler error')
        if (property) error[property] = value

        const channel = diagnostics.channel('tracing:fastify.request.handler:error')
        let diagnosticsStatusCode
        const subscriber = (message) => {
          diagnosticsStatusCode = message.reply.statusCode
          t.assert.strictEqual(message.error, error)
        }
        channel.subscribe(subscriber)
        t.after(() => channel.unsubscribe(subscriber))

        if (customHandler) {
          fastify.setErrorHandler((error, request, reply) => {
            reply.code(502).send({ message: error.message })
          })
        }

        if (path === 'preHandler') {
          fastify.addHook('preHandler', (request, reply, done) => done(error))
          fastify.get('/', () => 'unreachable')
        } else if (path === 'async') {
          fastify.get('/', async () => { throw error })
        } else {
          fastify.get('/', () => { throw error })
        }

        const response = await fastify.inject('/')
        t.assert.strictEqual(diagnosticsStatusCode, expected)
        t.assert.strictEqual(response.statusCode, customHandler ? 502 : expected)
      })
    }
  }
}
