'use strict'

const { test } = require('node:test')
const { spyWarning } = require('process-warning')
const { Readable } = require('node:stream')
const Fastify = require('..')
const keys = require('../lib/symbols')
const { FST_ERR_CTP_ALREADY_PRESENT, FST_ERR_CTP_INVALID_TYPE, FST_ERR_CTP_INVALID_MEDIA_TYPE } = require('../lib/errors')
const { FSTSEC001 } = require('../lib/warnings')

const first = function (req, payload, done) {}
const second = function (req, payload, done) {}
const third = function (req, payload, done) {}

test('string body keeps multi-byte characters split across chunks', async t => {
  t.plan(2)

  const fastify = Fastify()
  const encoded = Buffer.from(JSON.stringify({ hello: 'wörld ✓ 😀' }))

  fastify.addHook('preParsing', async () => {
    // Emit one byte per chunk so every multi-byte character is split
    return Readable.from(Array.from(encoded, byte => Buffer.from([byte])), { objectMode: false })
  })
  fastify.post('/', async (request) => request.body)

  const res = await fastify.inject({
    method: 'POST',
    url: '/',
    headers: { 'content-type': 'application/json' },
    payload: encoded
  })
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(res.json(), { hello: 'wörld ✓ 😀' })
})

test('string body accepts string chunks from a preParsing stream', async t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.addHook('preParsing', async (request, reply, payload) => {
    payload.setEncoding('utf8')
    return payload
  })
  fastify.post('/', async (request) => request.body)

  const res = await fastify.inject({
    method: 'POST',
    url: '/',
    headers: { 'content-type': 'text/plain' },
    payload: 'hellö'
  })
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.body, 'hellö')
})

test('string body with invalid UTF-8 is not treated as a content-length mismatch', async t => {
  t.plan(2)

  const fastify = Fastify()
  fastify.post('/', async (request) => request.body)

  const res = await fastify.inject({
    method: 'POST',
    url: '/',
    headers: { 'content-type': 'text/plain' },
    payload: Buffer.from([0x61, 0xff, 0x62])
  })
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.body, 'a�b')
})
