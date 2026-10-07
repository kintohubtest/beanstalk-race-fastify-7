'use strict'

const { test } = require('node:test')
const fp = require('fastify-plugin')
const errors = require('http-errors')
const split = require('split2')
const Fastify = require('..')
const { getServerUrl } = require('./helper')

test('should honor disableRequestLogging function for 404', async t => {
  t.plan(3)

  const Writable = require('node:stream').Writable

  const logStream = new Writable()
  logStream.logs = []
  logStream._write = function (chunk, encoding, callback) {
    this.logs.push(JSON.parse(chunk.toString()))
    callback()
  }

  const fastify = Fastify({
    logger: {
      level: 'info',
      stream: logStream
    },
    disableRequestLogging: (req) => {
      // Disable logging for URLs containing 'silent'
      return req.url.includes('silent')
    }
  })

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  t.after(() => { fastify.close() })

  // First request to a non-existent route (no 'silent' in URL) - should log
  const response1 = await fastify.inject({
    method: 'GET',
    url: '/not-found'
  })
  t.assert.strictEqual(response1.statusCode, 404)

  // Second request to a non-existent route with 'silent' in URL - should not log
  const response2 = await fastify.inject({
    method: 'GET',
    url: '/silent-route'
  })
  t.assert.strictEqual(response2.statusCode, 404)

  // Check logs: first request should have logged, second should not
  // We expect: incoming request, Route not found info, request completed (for first request only)
  const infoLogs = logStream.logs.filter(log => log.msg && log.msg.includes('Route GET:/not-found not found'))
  t.assert.strictEqual(infoLogs.length, 1, 'Should log 404 info only for non-silent route')
})
