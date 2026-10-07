'use strict'

const { test, describe } = require('node:test')
const Fastify = require('..')
const { Readable } = require('node:stream')
const { createHash } = require('node:crypto')
const { sleep } = require('./helper')

describe('trailer handler counter', () => {
  const data = JSON.stringify({ hello: 'world' })
  const hash = createHash('md5')
  hash.update(data)
  const md5 = hash.digest('hex')

  test('mixed callback and promise trailers only use the first completion', (t, testDone) => {
    t.plan(7)
    const fastify = Fastify()

    fastify.get('/', function (request, reply) {
      reply.trailer('Async', function (reply, payload, done) {
        setTimeout(() => done(null, 'async'), 10)
      })
      reply.trailer('Mixed', function (reply, payload, done) {
        done(null, 'correct')
        return Promise.resolve('corrupted')
      })
      reply.send('hello')
    })

    fastify.inject({
      method: 'GET',
      url: '/'
    }, (error, res) => {
      t.assert.ifError(error)
      t.assert.strictEqual(res.statusCode, 200)
      t.assert.strictEqual(res.headers['transfer-encoding'], 'chunked')
      t.assert.strictEqual(res.headers.trailer, 'async mixed')
      t.assert.strictEqual(res.trailers.async, 'async')
      t.assert.strictEqual(res.trailers.mixed, 'correct')
      t.assert.ok(!res.headers['content-length'])
      testDone()
    })
  })
})
