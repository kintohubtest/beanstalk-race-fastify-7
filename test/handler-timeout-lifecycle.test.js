'use strict'

const { test } = require('node:test')
const http = require('node:http')
const Fastify = require('..')
const { kAbortController, kTimeoutTimer, kOnAbort } = require('../lib/symbols')

test('disabled timeout creates no cancellation resources', async t => {
  const app = Fastify()
  app.get('/', async request => {
    t.assert.strictEqual(request[kAbortController], undefined)
    t.assert.strictEqual(request[kTimeoutTimer], undefined)
    t.assert.strictEqual(request[kOnAbort], undefined)
    return 'ok'
  })
  await app.inject('/')
  await app.close()
})

test('timeout and normal response preserve a reused keep-alive connection', async t => {
  const app = Fastify({ handlerTimeout: 30 })
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 })
  t.after(() => agent.destroy())
  t.after(() => app.close())
  let timedOutSignal
  let completedSignal
  app.get('/slow', async request => {
    timedOutSignal = request.signal
    await new Promise(resolve => request.signal.addEventListener('abort', resolve, { once: true }))
  })
  app.register(async instance => {
    instance.get('/fast', async request => {
      completedSignal = request.signal
      return 'ok'
    })
  })
  await app.listen({ port: 0 })
  const port = app.server.address().port
  async function get (path) {
    return new Promise((resolve, reject) => {
      const req = http.get({ port, path, agent }, res => {
        res.resume()
        res.on('end', () => resolve({ status: res.statusCode, socket: req.socket }))
      })
      req.on('error', reject)
    })
  }
  const slow = await get('/slow')
  const fast = await get('/fast')
  t.assert.strictEqual(slow.status, 503)
  t.assert.strictEqual(fast.status, 200)
  t.assert.strictEqual(fast.socket, slow.socket)
  t.assert.strictEqual(timedOutSignal.reason.code, 'FST_ERR_HANDLER_TIMEOUT')
  agent.destroy()
  await new Promise(resolve => setImmediate(resolve))
  t.assert.strictEqual(completedSignal.aborted, false)
})
