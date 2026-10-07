'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const keys = require('../lib/symbols')
const { FST_ERR_CTP_ALREADY_PRESENT, FST_ERR_CTP_INVALID_TYPE, FST_ERR_CTP_INVALID_MEDIA_TYPE } = require('../lib/errors')

const first = function (req, payload, done) {}
const second = function (req, payload, done) {}
const third = function (req, payload, done) {}

test('Error thrown 415 from content type is null and make post request to server', (t, done) => {
  t.plan(3)

  const fastify = Fastify()
  const errMsg = new FST_ERR_CTP_INVALID_MEDIA_TYPE().message

  fastify.post('/', (req, reply) => {
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    body: 'some text'
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.statusCode, 415)
    t.assert.strictEqual(JSON.parse(res.body).message, errMsg)
    done()
  })
})

test('invalid content-type error message should not contain format placeholder', (t, done) => {
  t.plan(4)

  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send('ok')
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    headers: { 'Content-Type': 'invalid-content-type' },
    body: 'test'
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.statusCode, 415)
    const body = JSON.parse(res.body)
    t.assert.strictEqual(body.code, 'FST_ERR_CTP_INVALID_MEDIA_TYPE')
    t.assert.strictEqual(body.message, 'Unsupported Media Type')
    done()
  })
})
