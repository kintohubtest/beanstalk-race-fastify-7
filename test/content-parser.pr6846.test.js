'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const keys = require('../lib/symbols')
const { FST_ERR_CTP_ALREADY_PRESENT, FST_ERR_CTP_INVALID_TYPE, FST_ERR_CTP_INVALID_MEDIA_TYPE } = require('../lib/errors')

const first = function (req, payload, done) {}
const second = function (req, payload, done) {}
const third = function (req, payload, done) {}

test('content-type match - RegExp with global flag', async t => {
  t.plan(4)

  const fastify = Fastify()
  fastify.addContentTypeParser(/^application\/.+\+xml$/g, { parseAs: 'string' }, function (request, body, done) {
    done(null, body)
  })

  fastify.post('/', async (request) => request.body)

  // Two distinct content types that both match the parser. A RegExp with the
  // `g` flag keeps a mutable lastIndex between test() calls, so the second
  // content type must still match rather than fall through to 415.
  const first = await fastify.inject({
    method: 'POST',
    path: '/',
    headers: { 'content-type': 'application/vnd.a+xml' },
    body: '<a/>'
  })
  const second = await fastify.inject({
    method: 'POST',
    path: '/',
    headers: { 'content-type': 'application/vnd.b+xml' },
    body: '<b/>'
  })

  t.assert.strictEqual(first.statusCode, 200)
  t.assert.strictEqual(first.payload, '<a/>')
  t.assert.strictEqual(second.statusCode, 200)
  t.assert.strictEqual(second.payload, '<b/>')
})
