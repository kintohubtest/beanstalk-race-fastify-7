'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const { waitForCb } = require('./toolkit')

test('Prefix with trailing / and nested prefix without leading /', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, done) {
    fastify.register(function (fastify, opts, done) {
      fastify.get('/route', (req, reply) => {
        reply.send({ hello: 'world' })
      })
      done()
    }, { prefix: 'inner' })
    done()
  }, { prefix: '/v1/' })

  const completion = waitForCb({ steps: 2 })
  fastify.inject({
    method: 'GET',
    url: '/v1/inner/route'
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
    completion.stepIn()
  })
  fastify.inject({
    method: 'GET',
    url: '/v1//inner/route'
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.statusCode, 404)
    completion.stepIn()
  })
  completion.patience.then(testDone)
})
