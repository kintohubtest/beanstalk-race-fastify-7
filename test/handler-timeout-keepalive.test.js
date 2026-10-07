'use strict'

const { test } = require('node:test')
const http = require('node:http')
const Fastify = require('..')

test('an injected handler can wait for cancellation without other active timers', async t => {
  const fastify = Fastify({ handlerTimeout: 10 })
  t.after(() => fastify.close())
  fastify.get('/', async request => {
    await new Promise(resolve => request.signal.addEventListener('abort', resolve, { once: true }))
    return 'late'
  })
  const response = await fastify.inject('/')
  t.assert.strictEqual(response.statusCode, 503)
  t.assert.strictEqual(response.json().code, 'FST_ERR_HANDLER_TIMEOUT')
})

test('handler timeouts stay isolated across requests on a keep-alive socket', async t => {
  const fastify = Fastify({ handlerTimeout: 50 })
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 })
  t.after(async () => {
    agent.destroy()
    await fastify.close()
  })

  let firstSignal
  let firstSocket
  let timeoutSignal
  fastify.get('/fast', async request => {
    if (firstSignal) {
      t.assert.strictEqual(request.raw.socket, firstSocket)
    } else {
      firstSignal = request.signal
      firstSocket = request.raw.socket
    }
    return 'ok'
  })
  fastify.get('/slow', async request => {
    t.assert.strictEqual(request.raw.socket, firstSocket)
    timeoutSignal = request.signal
    await new Promise(resolve => request.signal.addEventListener('abort', resolve, { once: true }))
    return 'late'
  })

  const address = await fastify.listen({ port: 0, host: '127.0.0.1' })
  function get (path) {
    return new Promise((resolve, reject) => {
      http.get(address + path, { agent }, response => {
        response.resume()
        response.on('end', () => resolve(response.statusCode))
      }).on('error', reject)
    })
  }

  t.assert.strictEqual(await get('/fast'), 200)
  t.assert.strictEqual(await get('/slow'), 503)
  t.assert.strictEqual(timeoutSignal.reason.code, 'FST_ERR_HANDLER_TIMEOUT')
  t.assert.strictEqual(firstSignal.aborted, false)
  t.assert.strictEqual(await get('/fast'), 200)
})
