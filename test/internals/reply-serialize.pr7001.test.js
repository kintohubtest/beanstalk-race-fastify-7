'use strict'

const { test } = require('node:test')
const { kReplyCacheSerializeFns, kRouteContext } = require('../../lib/symbols')
const Fastify = require('../../fastify')

function getDefaultSchema () {
  return {
    type: 'object',
    required: ['hello'],
    properties: {
      hello: { type: 'string' },
      world: { type: 'string' }
    }
  }
}

function getResponseSchema () {
  return {
    201: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['ok']
        },
        message: {
          type: 'string'
        }
      }
    },
    '4xx': {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['error']
        },
        code: {
          type: 'integer',
          minimum: 1
        },
        message: {
          type: 'string'
        }
      }
    },
    '3xx': {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              fullName: { type: 'string' },
              phone: { type: 'number' }
            }
          }
        }
      }
    }
  }
}

test('Reply#compileSerializationSchema omits absent metadata instead of passing null', async t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.setSerializerCompiler(({ httpStatus, contentType }) => {
    t.assert.strictEqual(httpStatus, undefined)
    t.assert.strictEqual(contentType, undefined)

    return input => JSON.stringify(input)
  })

  fastify.get('/', (req, reply) => {
    reply.compileSerializationSchema(getDefaultSchema())
    reply.send({ hello: 'world' })
  })

  await fastify.inject({ path: '/', method: 'GET' })
})
