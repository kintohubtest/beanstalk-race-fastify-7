'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const fastifyPlugin = require('fastify-plugin')

test('findRoute should return null when method is not passed', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.get('/artists/:artistId', {
    schema: {
      params: { artistId: { type: 'integer' } }
    },
    handler: (req, reply) => reply.send(typeof req.params.artistId)
  })

  t.assert.strictEqual(fastify.findRoute({
    url: '/artists/:artistId'
  }), null)
})

test('findRoute should find a route even if method is not uppercased', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.get('/artists/:artistId', {
    schema: {
      params: { artistId: { type: 'integer' } }
    },
    handler: (req, reply) => reply.send(typeof req.params.artistId)
  })

  const route = fastify.findRoute({
    method: 'get',
    url: '/artists/:artistId'
  })
  t.assert.notStrictEqual(route, null)
  t.assert.strictEqual(route.params.artistId, ':artistId')
})
