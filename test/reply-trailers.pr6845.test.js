'use strict'

const { test, describe } = require('node:test')
const Fastify = require('..')
const { Readable } = require('node:stream')
const { createHash } = require('node:crypto')
const { sleep } = require('./helper')

test('remove trailer while stream is being consumed', (t, testDone) => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    const stream = Readable.from((function * () {
      reply.removeTrailer('ETag')
      yield 'hello'
    })())

    reply.trailer('ETag', function () {
      t.assert.fail('removed trailer should not be called')
    })

    reply.send(stream)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.payload, 'hello')
    t.assert.strictEqual(res.headers.trailer, 'etag')
    t.assert.strictEqual(res.trailers.etag, undefined)
    testDone()
  })
})

test('remove all trailers', (t, testDone) => {
  t.plan(6)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', function (reply, payload, done) {
      t.assert.fail('it should not called as this trailer is removed')
      done(null, 'custom-etag')
    })
    reply.removeTrailer('ETag')
    reply.trailer('Should-Not-Call', function (reply, payload, done) {
      t.assert.fail('it should not called as this trailer is removed')
      done(null, 'should-not-call')
    })
    reply.removeTrailer('Should-Not-Call')
    reply.send('')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers.trailer, undefined)
    t.assert.strictEqual(res.trailers.etag, undefined)
    t.assert.strictEqual(res.trailers['should-not-call'], undefined)
    t.assert.strictEqual(res.headers['content-length'], '0')
    testDone()
  })
})

test('remove some trailers should keep trailer mode for the remaining ones', (t, testDone) => {
  t.plan(6)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', function () {
      t.assert.fail('removed trailer should not be called')
    })
    reply.removeTrailer('ETag')
    reply.trailer('Content-MD5', function (reply, payload, done) {
      done(null, 'custom-md5')
    })
    reply.send('hello')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers.trailer, 'content-md5')
    t.assert.strictEqual(res.headers['transfer-encoding'], 'chunked')
    t.assert.strictEqual(res.headers['content-length'], undefined)
    t.assert.strictEqual(res.trailers['content-md5'], 'custom-md5')
    testDone()
  })
})

test('remove all trailers should behave like no trailers were registered', (t, testDone) => {
  t.plan(6)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', function () {
      t.assert.fail('removed trailer should not be called')
    })
    reply.removeTrailer('ETag')
    reply.send('hello')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers.trailer, undefined)
    t.assert.strictEqual(res.headers['transfer-encoding'], undefined)
    t.assert.strictEqual(res.headers['content-length'], '5')
    t.assert.strictEqual(res.trailers.etag, undefined)
    testDone()
  })
})
