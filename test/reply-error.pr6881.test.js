'use strict'

const { test, describe } = require('node:test')
const net = require('node:net')
const Fastify = require('..')
const statusCodes = require('node:http').STATUS_CODES
const split = require('split2')
const fs = require('node:fs')
const path = require('node:path')

const codes = Object.keys(statusCodes)
codes.forEach(code => {
  if (Number(code) >= 400) helper(code)
})

function helper (code) {
  test('Reply error handling - code: ' + code, (t, testDone) => {
    t.plan(4)
    const fastify = Fastify()
    t.after(() => fastify.close())
    const err = new Error('winter is coming')

    fastify.get('/', (req, reply) => {
      reply
        .code(Number(code))
        .send(err)
    })

    fastify.inject({
      method: 'GET',
      url: '/'
    }, (error, res) => {
      t.assert.ifError(error)
      t.assert.strictEqual(res.statusCode, Number(code))
      t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
      t.assert.deepStrictEqual(
        {
          error: statusCodes[code],
          message: err.message,
          statusCode: Number(code)
        },
        JSON.parse(res.payload)
      )
      testDone()
    })
  })
}

// Issue 2078 https://github.com/fastify/fastify/issues/2078
// Supported error code list: https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
const invalidErrorCodes = [
  undefined,
  null,
  'error_code',

  // out of the 100-599 range:
  0,
  1,
  99,
  600,
  700
]
invalidErrorCodes.forEach((invalidCode) => {
  test(`should throw error if error code is ${invalidCode}`, (t, testDone) => {
    t.plan(2)
    const fastify = Fastify()
    t.after(() => fastify.close())
    fastify.get('/', (request, reply) => {
      try {
        return reply.code(invalidCode).send('You should not read this')
      } catch (err) {
        t.assert.strictEqual(err.code, 'FST_ERR_BAD_STATUS_CODE')
        t.assert.strictEqual(err.message, 'Called reply with an invalid status code: ' + invalidCode)
        testDone()
      }
    })

    fastify.inject({
      url: '/',
      method: 'GET'
    }, (e, res) => {
      t.assert.fail('should not be called')
    })
  })
})

test('should catch error when setting invalid header on async preSerializeation hook', async (t) => {
  t.plan(2)

  const app = Fastify()
  app.addHook('preSerialization', async (_, reply) => {
    reply.header('X-Invalid', '\n')
  })
  app.addHook('onError', function (request, reply, err, done) {
    // onError will run twice, since it execute preSerialization hook twice
    // requires to fallback to root error handler
    t.assert.ok(err)
    done()
  })
  app.get('/', async () => ({ ok: true }))
  await app.inject({ method: 'GET', path: '/' })
})

test('should catch error when setting invalid header on async onSend hook', async (t) => {
  t.plan(2)

  const app = Fastify()
  app.addHook('onSend', async (_, reply, payload) => {
    reply.header('X-Invalid', '\n')
    return payload
  })
  app.addHook('onError', function (request, reply, err, done) {
    // onError will run twice, since it execute onSend hook twice
    // requires to fallback to root error handler
    t.assert.ok(err)
    done()
  })
  app.get('/', async () => ({ ok: true }))
  await app.inject({ method: 'GET', path: '/' })
})
