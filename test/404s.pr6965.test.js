'use strict'

const { test } = require('node:test')
const fp = require('fastify-plugin')
const errors = require('http-errors')
const split = require('split2')
const Fastify = require('..')
const { getServerUrl } = require('./helper')

// https://github.com/fastify/fastify/issues/713
test('preHandler option for setNotFoundHandler', async t => {
  t.plan(11)

  await t.test('preHandler option', (t, done) => {
    t.plan(2)
    const fastify = Fastify()

    fastify.setNotFoundHandler({
      preHandler: (req, reply, done) => {
        req.body.preHandler = true
        done()
      }
    }, function (req, reply) {
      reply.code(404).send(req.body)
    })

    fastify.inject({
      method: 'POST',
      url: '/not-found',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.assert.ifError(err)
      const payload = JSON.parse(res.payload)
      t.assert.deepStrictEqual(payload, { preHandler: true, hello: 'world' })
      done()
    })
  })

  // https://github.com/fastify/fastify/issues/2229
  await t.test('preHandler hook in setNotFoundHandler should be called when callNotFound', { timeout: 40000 }, (t, done) => {
    t.plan(3)
    const fastify = Fastify()

    fastify.setNotFoundHandler({
      preHandler: (req, reply, done) => {
        req.body.preHandler = true
        done()
      }
    }, function (req, reply) {
      reply.code(404).send(req.body)
    })

    fastify.post('/', function (req, reply) {
      t.assert.strictEqual(reply.callNotFound(), reply)
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.assert.ifError(err)
      const payload = JSON.parse(res.payload)
      t.assert.deepStrictEqual(payload, { preHandler: true, hello: 'world' })
      done()
    })
  })

  // https://github.com/fastify/fastify/security/advisories/GHSA-gm8r-x7h4-fm5r
  await t.test('preHandler hook in setNotFoundHandler should be called when callNotFound and the route is registered first', (t, done) => {
    t.plan(3)
    const fastify = Fastify()

    // Register the route before the not-found handler so that the route's
    // preReady callback snapshots the not-found context before its lifecycle
    // hooks are populated.
    fastify.post('/', function (req, reply) {
      t.assert.strictEqual(reply.callNotFound(), reply)
    })

    fastify.setNotFoundHandler({
      preHandler: (req, reply, done) => {
        req.body.preHandler = true
        done()
      }
    }, function (req, reply) {
      reply.code(404).send(req.body)
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.assert.ifError(err)
      const payload = JSON.parse(res.payload)
      t.assert.deepStrictEqual(payload, { preHandler: true, hello: 'world' })
      done()
    })
  })

  await t.test('preHandler hook in setNotFoundHandler should accept an array of functions and be called when callNotFound', (t, done) => {
    t.plan(2)
    const fastify = Fastify()

    fastify.setNotFoundHandler({
      preHandler: [
        (req, reply, done) => {
          req.body.preHandler1 = true
          done()
        },
        (req, reply, done) => {
          req.body.preHandler2 = true
          done()
        }
      ]
    }, function (req, reply) {
      reply.code(404).send(req.body)
    })

    fastify.post('/', function (req, reply) {
      reply.callNotFound()
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.assert.ifError(err)
      const payload = JSON.parse(res.payload)
      t.assert.deepStrictEqual(payload, { preHandler1: true, preHandler2: true, hello: 'world' })
      done()
    })
  })

  await t.test('preHandler option should be called after preHandler hook', (t, done) => {
    t.plan(2)
    const fastify = Fastify()

    fastify.addHook('preHandler', (req, reply, done) => {
      req.body.check = 'a'
      done()
    })

    fastify.setNotFoundHandler({
      preHandler: (req, reply, done) => {
        req.body.check += 'b'
        done()
      }
    }, (req, reply) => {
      reply.send(req.body)
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.assert.ifError(err)
      const payload = JSON.parse(res.payload)
      t.assert.deepStrictEqual(payload, { check: 'ab', hello: 'world' })
      done()
    })
  })

  await t.test('preHandler option should be unique per prefix', async t => {
    t.plan(2)
    const fastify = Fastify()

    fastify.setNotFoundHandler({
      preHandler: (req, reply, done) => {
        req.body.hello = 'earth'
        done()
      }
    }, (req, reply) => {
      reply.send(req.body)
    })

    fastify.register(function (i, o, n) {
      i.setNotFoundHandler((req, reply) => {
        reply.send(req.body)
      })

      n()
    }, { prefix: '/no' })

    {
      const res = await fastify.inject({
        method: 'POST',
        url: '/not-found',
        payload: { hello: 'world' }
      })

      const payload = JSON.parse(res.payload)
      t.assert.deepStrictEqual(payload, { hello: 'earth' })
    }

    {
      const res = await fastify.inject({
        method: 'POST',
        url: '/no/not-found',
        payload: { hello: 'world' }
      })

      const payload = JSON.parse(res.payload)
      t.assert.deepStrictEqual(payload, { hello: 'world' })
    }
  })

  await t.test('preHandler option should handle errors', (t, done) => {
    t.plan(3)
    const fastify = Fastify()

    fastify.setNotFoundHandler({
      preHandler: (req, reply, done) => {
        done(new Error('kaboom'))
      }
    }, (req, reply) => {
      reply.send(req.body)
    })

    fastify.inject({
      method: 'POST',
      url: '/not-found',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.assert.ifError(err)
      const payload = JSON.parse(res.payload)
      t.assert.strictEqual(res.statusCode, 500)
      t.assert.deepStrictEqual(payload, {
        message: 'kaboom',
        error: 'Internal Server Error',
        statusCode: 500
      })
      done()
    })
  })

  await t.test('preHandler option should handle errors with custom status code', (t, done) => {
    t.plan(3)
    const fastify = Fastify()

    fastify.setNotFoundHandler({
      preHandler: (req, reply, done) => {
        reply.code(401)
        done(new Error('go away'))
      }
    }, (req, reply) => {
      reply.send(req.body)
    })

    fastify.inject({
      method: 'POST',
      url: '/not-found',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.assert.ifError(err)
      const payload = JSON.parse(res.payload)
      t.assert.strictEqual(res.statusCode, 401)
      t.assert.deepStrictEqual(payload, {
        message: 'go away',
        error: 'Unauthorized',
        statusCode: 401
      })
      done()
    })
  })

  await t.test('preHandler option could accept an array of functions', (t, done) => {
    t.plan(2)
    const fastify = Fastify()

    fastify.setNotFoundHandler({
      preHandler: [
        (req, reply, done) => {
          req.body.preHandler = 'a'
          done()
        },
        (req, reply, done) => {
          req.body.preHandler += 'b'
          done()
        }
      ]
    }, (req, reply) => {
      reply.send(req.body)
    })

    fastify.inject({
      method: 'POST',
      url: '/not-found',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.assert.ifError(err)
      const payload = JSON.parse(res.payload)
      t.assert.deepStrictEqual(payload, { preHandler: 'ab', hello: 'world' })
      done()
    })
  })

  await t.test('preHandler option does not interfere with preHandler', async t => {
    t.plan(2)
    const fastify = Fastify()

    fastify.addHook('preHandler', (req, reply, done) => {
      req.body.check = 'a'
      done()
    })

    fastify.setNotFoundHandler({
      preHandler: (req, reply, done) => {
        req.body.check += 'b'
        done()
      }
    }, (req, reply) => {
      reply.send(req.body)
    })

    fastify.register(function (i, o, n) {
      i.setNotFoundHandler((req, reply) => {
        reply.send(req.body)
      })

      n()
    }, { prefix: '/no' })

    {
      const res = await fastify.inject({
        method: 'post',
        url: '/not-found',
        payload: { hello: 'world' }
      })

      const payload = JSON.parse(res.payload)
      t.assert.deepStrictEqual(payload, { check: 'ab', hello: 'world' })
    }

    {
      const res = await fastify.inject({
        method: 'post',
        url: '/no/not-found',
        payload: { hello: 'world' }
      })

      const payload = JSON.parse(res.payload)
      t.assert.deepStrictEqual(payload, { check: 'a', hello: 'world' })
    }
  })

  await t.test('preHandler option should keep the context', (t, done) => {
    t.plan(3)
    const fastify = Fastify()

    fastify.decorate('foo', 42)

    fastify.setNotFoundHandler({
      preHandler: function (req, reply, done) {
        t.assert.strictEqual(this.foo, 42)
        this.foo += 1
        req.body.foo = this.foo
        done()
      }
    }, (req, reply) => {
      reply.send(req.body)
    })

    fastify.inject({
      method: 'POST',
      url: '/not-found',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.assert.ifError(err)
      const payload = JSON.parse(res.payload)
      t.assert.deepStrictEqual(payload, { foo: 43, hello: 'world' })
      done()
    })
  })
})
