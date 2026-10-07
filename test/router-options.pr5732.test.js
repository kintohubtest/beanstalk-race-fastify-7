'use strict'

const split = require('split2')
const { test } = require('node:test')
const querystring = require('node:querystring')
const Fastify = require('../')
const {
  FST_ERR_BAD_URL,
  FST_ERR_ASYNC_CONSTRAINT
} = require('../lib/errors')

test('Should honor disableRequestLogging function in frameworkErrors wrapper - FST_ERR_BAD_URL', (t, done) => {
  t.plan(4)

  let logCallCount = 0
  const logStream = split(JSON.parse)

  const fastify = Fastify({
    disableRequestLogging: (req) => {
      // Disable logging for URLs containing 'silent'
      return req.url.includes('silent')
    },
    frameworkErrors: function (err, req, res) {
      res.send(`${err.message} - ${err.code}`)
    },
    logger: {
      stream: logStream,
      level: 'info'
    }
  })

  fastify.get('/test/:id', (req, res) => {
    res.send('{ hello: \'world\' }')
  })

  logStream.on('data', (json) => {
    if (json.msg === 'incoming request') {
      logCallCount++
    }
  })

  // First request: URL does not contain 'silent', so logging should happen
  fastify.inject(
    {
      method: 'GET',
      url: '/test/%world'
    },
    (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.body, '\'/test/%world\' is not a valid url component - FST_ERR_BAD_URL')

      // Second request: URL contains 'silent', so logging should be disabled
      fastify.inject(
        {
          method: 'GET',
          url: '/silent/%world'
        },
        (err2, res2) => {
          t.assert.ifError(err2)
          // Give time for any potential log events
          setImmediate(() => {
            // Only the first request should have logged
            t.assert.strictEqual(logCallCount, 1)
            done()
          })
        }
      )
    }
  )
})

test('Should honor disableRequestLogging function in frameworkErrors wrapper - FST_ERR_ASYNC_CONSTRAINT', (t, done) => {
  t.plan(4)

  let logCallCount = 0

  const constraint = {
    name: 'secret',
    storage: function () {
      const secrets = {}
      return {
        get: (secret) => { return secrets[secret] || null },
        set: (secret, store) => { secrets[secret] = store }
      }
    },
    deriveConstraint: (req, ctx, done) => {
      done(Error('kaboom'))
    },
    validate () { return true }
  }

  const logStream = split(JSON.parse)

  const fastify = Fastify({
    constraints: { secret: constraint },
    disableRequestLogging: (req) => {
      // Disable logging for URLs containing 'silent'
      return req.url.includes('silent')
    },
    frameworkErrors: function (err, req, res) {
      res.send(`${err.message} - ${err.code}`)
    },
    logger: {
      stream: logStream,
      level: 'info'
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { secret: 'alpha' },
    handler: (req, reply) => {
      reply.send({ hello: 'from alpha' })
    }
  })

  fastify.route({
    method: 'GET',
    url: '/silent',
    constraints: { secret: 'alpha' },
    handler: (req, reply) => {
      reply.send({ hello: 'from alpha' })
    }
  })

  logStream.on('data', (json) => {
    if (json.msg === 'incoming request') {
      logCallCount++
    }
  })

  // First request: URL does not contain 'silent', so logging should happen
  fastify.inject(
    {
      method: 'GET',
      url: '/'
    },
    (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.body, 'Unexpected error from async constraint - FST_ERR_ASYNC_CONSTRAINT')

      // Second request: URL contains 'silent', so logging should be disabled
      fastify.inject(
        {
          method: 'GET',
          url: '/silent'
        },
        (err2, res2) => {
          t.assert.ifError(err2)
          // Give time for any potential log events
          setImmediate(() => {
            // Only the first request should have logged
            t.assert.strictEqual(logCallCount, 1)
            done()
          })
        }
      )
    }
  )
})
