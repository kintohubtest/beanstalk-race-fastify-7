'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('Fastify should throw on multiple assignment to the same route with array method', (t) => {
  t.plan(1)
  const fastify = Fastify()

  fastify.route({ method: ['GET', 'POST'], url: '/', handler: () => {} })

  try {
    fastify.route({ method: ['GET', 'POST'], url: '/', handler: () => {} })
    t.assert.fail('Should throw fastify duplicated route declaration')
  } catch (error) {
    t.assert.strictEqual(error.code, 'FST_ERR_DUPLICATED_ROUTE')
  }
})
