'use strict'

const { test } = require('node:test')
const stream = require('node:stream')
const Fastify = require('..')
const fp = require('fastify-plugin')
const fs = require('node:fs')
const split = require('split2')
const symbols = require('../lib/symbols.js')
const payload = { hello: 'world' }
const proxyquire = require('proxyquire')
const { connect } = require('node:net')
const { sleep } = require('./helper')
const { waitForCb } = require('./toolkit.js')
const { fetch } = require('undici')

process.removeAllListeners('warning')

test('socket._meta is cleared after response to prevent keep-alive leaks', async t => {
  t.plan(3)
  const fastify = Fastify({ connectionTimeout: 500 })
  t.after(() => { fastify.close() })

  fastify.addHook('onTimeout', function (req, res, done) { done() })

  fastify.addHook('onResponse', function (req, reply, done) {
    t.assert.strictEqual(req.raw.socket._meta, null, 'socket._meta must be null after response')
    done()
  })

  fastify.get('/', async (req, reply) => {
    return { hello: 'world' }
  })

  const address = await fastify.listen({ port: 0 })
  const result = await fetch(address)
  t.assert.ok(result.ok)
  t.assert.strictEqual(result.status, 200)
})
