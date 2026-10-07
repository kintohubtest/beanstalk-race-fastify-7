'use strict'

const stream = require('node:stream')
const { ReadableStream } = require('node:stream/web')
const split = require('split2')
const { test } = require('node:test')
const Fastify = require('..')
const createError = require('@fastify/error')

test('HEAD route should handle ReadableStream.cancel() error', (t, done) => {
  t.plan(7)

  const logStream = split(JSON.parse)
  const expectedError = new Error('Cancel error!')
  const fastify = Fastify({
    logger: {
      stream: logStream,
      level: 'error'
    }
  })

  fastify.route({
    method: 'GET',
    path: '/web-stream',
    exposeHeadRoute: true,
    handler: (req, reply) => {
      const webStream = new ReadableStream({
        start (controller) {
          controller.enqueue('Hello from web stream!')
        },
        cancel (reason) {
          t.assert.strictEqual(reason, 'Stream cancelled by HEAD route')
          throw expectedError
        }
      })
      return webStream
    }
  })

  logStream.once('data', line => {
    const { message, stack } = expectedError
    t.assert.deepStrictEqual(line.err, { type: 'Error', message, stack })
    t.assert.strictEqual(line.msg, 'Error on Stream found for HEAD route')
    t.assert.strictEqual(line.level, 50)
  })

  fastify.inject({
    method: 'HEAD',
    url: '/web-stream'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers['content-type'], undefined)
    done()
  })
})
