'use strict'

const { test } = require('node:test')
const http = require('node:http')
const Fastify = require('..')
const { kAbortController, kTimeoutTimer, kOnAbort } = require('../lib/symbols')

test('disabled timeout creates no controller or response listeners', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())
  fastify.get('/', (request, reply) => {
    t.assert.strictEqual(request[kAbortController], undefined)
    t.assert.strictEqual(request[kTimeoutTimer], undefined)
    t.assert.strictEqual(request[kOnAbort], undefined)
    reply.send('ok')
  })
  t.assert.strictEqual((await fastify.inject('/')).statusCode, 200)
})

test('error responses and hijacking clean up both eager and lazy signals', async t => {
  for (const handlerTimeout of [0, 1000]) {
    for (const hijack of [false, true]) {
      const fastify = Fastify({ handlerTimeout })
      t.after(() => fastify.close())
      let captured
      fastify.get('/', (request, reply) => {
        captured = request
        t.assert.strictEqual(request.signal, request.signal)
        if (hijack) {
          reply.hijack()
          reply.raw.end('ok')
        } else {
          throw new Error('test error')
        }
      })
      const res = await fastify.inject('/')
      t.assert.strictEqual(res.statusCode, hijack ? 200 : 500)
      t.assert.strictEqual(captured[kTimeoutTimer], null)
      t.assert.strictEqual(captured[kOnAbort], null)
      t.assert.strictEqual(captured.signal.aborted, false)
    }
  }
})

test('a timed out request does not affect the next request on a keep-alive socket', async t => {
  const fastify = Fastify({ handlerTimeout: 30 })
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 })
  t.after(() => {
    agent.destroy()
    return fastify.close()
  })
  let timedOutRequest
  let fastRequest
  fastify.get('/slow', async request => {
    timedOutRequest = request
    await new Promise(resolve => request.signal.addEventListener('abort', resolve, { once: true }))
  })
  fastify.get('/fast', async request => {
    fastRequest = request
    return 'ok'
  })
  await fastify.listen({ port: 0 })
  const port = fastify.server.address().port
  function get (path) {
    return new Promise((resolve, reject) => {
      const req = http.get({ host: 'localhost', port, path, agent }, res => {
        res.resume()
        res.on('end', () => resolve({ statusCode: res.statusCode, socket: req.socket }))
      })
      req.on('error', reject)
    })
  }
  const slow = await get('/slow')
  const fast = await get('/fast')
  t.assert.strictEqual(slow.statusCode, 503)
  t.assert.strictEqual(fast.statusCode, 200)
  t.assert.strictEqual(slow.socket, fast.socket)
  t.assert.strictEqual(timedOutRequest.signal.reason.code, 'FST_ERR_HANDLER_TIMEOUT')
  t.assert.strictEqual(timedOutRequest[kOnAbort], null)
  t.assert.strictEqual(fastRequest.signal.aborted, false)
  t.assert.strictEqual(fastRequest[kTimeoutTimer], null)
  t.assert.strictEqual(fastRequest[kOnAbort], null)
})

test('negative server handlerTimeout is rejected', t => {
  t.assert.throws(() => Fastify({ handlerTimeout: -1 }), { code: 'FST_ERR_INIT_OPTS_INVALID' })
})

test('cooperative cancellation preserves an async timeout error handler', async t => {
  for (const rejectOnAbort of [false, true]) {
    const fastify = Fastify()
    t.after(() => fastify.close())
    fastify.get('/', {
      handlerTimeout: 10,
      errorHandler: async (error, request, reply) => {
        t.assert.strictEqual(error.code, 'FST_ERR_HANDLER_TIMEOUT')
        await new Promise(resolve => setTimeout(resolve, 30))
        reply.code(504).send('custom timeout')
      }
    }, async request => {
      await new Promise((resolve, reject) => {
        request.signal.addEventListener('abort', () => {
          if (rejectOnAbort) reject(request.signal.reason)
          else resolve()
        }, { once: true })
      })
      return 'late success'
    })
    const res = await fastify.inject('/')
    t.assert.strictEqual(res.statusCode, 504)
    t.assert.strictEqual(res.payload, 'custom timeout')
  }
})
