'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const { waitForCb } = require('./toolkit')

const echoBody = (req, reply) => { reply.send(req.body) }

test('response schema is applied when Content-Type has whitespace before parameters', (t, testDone) => {
  t.plan(3)

  const fastify = Fastify()
  fastify.get('/', {
    schema: {
      response: {
        200: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['public'],
                additionalProperties: false,
                properties: {
                  public: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, function (req, reply) {
    reply.header('Content-Type', 'application/json ; charset=utf-8')
    reply.send({ public: 'ok', secret: 'SHOULD_BE_STRIPPED' })
  })

  fastify.inject('/', (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.deepStrictEqual(res.json(), { public: 'ok' })
    testDone()
  })
})

test('response schema is applied when Content-Type has tab before semicolon', (t, testDone) => {
  t.plan(3)

  const fastify = Fastify()
  fastify.get('/', {
    schema: {
      response: {
        200: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['public'],
                additionalProperties: false,
                properties: {
                  public: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, function (req, reply) {
    reply.header('Content-Type', 'application/json\t; charset=utf-8')
    reply.send({ public: 'ok', secret: 'SHOULD_BE_STRIPPED' })
  })

  fastify.inject('/', (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.deepStrictEqual(res.json(), { public: 'ok' })
    testDone()
  })
})

test('response schema is applied when Content-Type has trailing semicolon only', (t, testDone) => {
  t.plan(3)

  const fastify = Fastify()
  fastify.get('/', {
    schema: {
      response: {
        200: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['public'],
                additionalProperties: false,
                properties: {
                  public: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, function (req, reply) {
    reply.header('Content-Type', 'application/json ;')
    reply.send({ public: 'ok', secret: 'SHOULD_BE_STRIPPED' })
  })

  fastify.inject('/', (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.deepStrictEqual(res.json(), { public: 'ok' })
    testDone()
  })
})
