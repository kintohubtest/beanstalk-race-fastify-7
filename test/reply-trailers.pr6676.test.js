'use strict'

const { test, describe } = require('node:test')
const Fastify = require('..')
const { Readable } = require('node:stream')
const { createHash } = require('node:crypto')
const { sleep } = require('./helper')

test('send is called once when multiple trailer callbacks run synchronously', (t, testDone) => {
  t.plan(6)
  const fastify = Fastify()
  let endCalls = 0
  let addTrailersCalls = 0

  fastify.get('/', function (request, reply) {
    const originalEnd = reply.raw.end.bind(reply.raw)
    reply.raw.end = function (...args) {
      endCalls++
      return originalEnd(...args)
    }
    const originalAddTrailers = reply.raw.addTrailers.bind(reply.raw)
    reply.raw.addTrailers = function (...args) {
      addTrailersCalls++
      return originalAddTrailers(...args)
    }
    reply.trailer('Return-Early', function (reply, payload, done) {
      done(null, 'a')
    })
    reply.trailer('Content-MD5', function (reply, payload, done) {
      done(null, 'b')
    })
    reply.send('hello')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.trailers['return-early'], 'a')
    t.assert.strictEqual(res.trailers['content-md5'], 'b')
    t.assert.strictEqual(endCalls, 1)
    t.assert.strictEqual(addTrailersCalls, 1)
    testDone()
  })
})
