'use strict'

const { describe, test } = require('node:test')
const Joi = require('joi')
const Fastify = require('..')

const schema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      work: { type: 'string' }
    },
    required: ['name', 'work']
  }
}

function echoBody (req, reply) {
  reply.code(200).send(req.body.name)
}

describe('sync and async must work in the same way', () => {
  // Route with custom validator that throws
  const throwingRouteValidator = {
    schema: {
      body: {
        type: 'object',
        properties: { name: { type: 'string' } }
      }
    },
    validatorCompiler: () => {
      return function (inputData) {
        // This custom validator throws a sync error instead of returning `{ error }`
        throw new Error('Custom validation failed')
      }
    },
    handler (request, reply) { reply.send({ success: true }) }
  }

  test('async preValidation with custom validator should trigger error handler when validator throws', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    fastify.setErrorHandler((error, request, reply) => {
      t.assert.ok(error instanceof Error, 'error should be an Error instance')
      t.assert.strictEqual(error.message, 'Custom validation failed')
      reply.status(500).send({ error: error.message })
    })

    // Add async preValidation hook
    fastify.addHook('preValidation', async (request, reply) => {
      await Promise.resolve('ok')
    })
    fastify.post('/async', throwingRouteValidator)

    const response = await fastify.inject({
      method: 'POST',
      url: '/async',
      payload: { name: 'test' }
    })
    t.assert.strictEqual(response.statusCode, 500)
    t.assert.deepStrictEqual(response.json(), { error: 'Custom validation failed' })
  })

  test('sync preValidation with custom validator should trigger error handler when validator throws', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    fastify.setErrorHandler((error, request, reply) => {
      t.assert.ok(error instanceof Error, 'error should be an Error instance')
      t.assert.strictEqual(error.message, 'Custom validation failed')
      reply.status(500).send({ error: error.message })
    })

    // Add sync preValidation hook
    fastify.addHook('preValidation', (request, reply, next) => { next() })
    fastify.post('/sync', throwingRouteValidator)

    const response = await fastify.inject({
      method: 'POST',
      url: '/sync',
      payload: { name: 'test' }
    })
    t.assert.strictEqual(response.statusCode, 500)
    t.assert.deepStrictEqual(response.json(), { error: 'Custom validation failed' })
  })
})
