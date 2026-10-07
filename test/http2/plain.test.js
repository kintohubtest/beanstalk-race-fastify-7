'use strict'

const { test } = require('node:test')
const Fastify = require('../..')
const h2url = require('h2url')
const { Readable } = require('node:stream')
const msg = { hello: 'world' }

test('http2 chunks large non-stream replies and preserves stream emissions', async t => {
  const cases = [
    { name: 'buffer at the chunk boundary', payload: Buffer.alloc(16384, 'a') },
    { name: 'buffer past the chunk boundary', payload: Buffer.alloc(16385, 'a') },
    { name: 'unicode string', payload: '😀'.repeat(16385) },
    { name: 'user stream', payload: Buffer.alloc(65537, 'a'), stream: true }
  ]

  for (const { name, payload, stream } of cases) {
    await t.test(name, async t => {
      const fastify = Fastify({ http2: true })
      const writes = []
      fastify.get('/', (req, reply) => {
        const write = reply.raw.write
        reply.raw.write = function (chunk, ...args) {
          writes.push(Buffer.byteLength(chunk))
          return write.call(this, chunk, ...args)
        }
        reply.send(stream ? Readable.from([payload]) : payload)
      })
      t.after(() => fastify.close())
      await fastify.listen({ port: 0, host: '127.0.0.1' })

      const res = await h2url.concat({
        url: `http://127.0.0.1:${fastify.server.address().port}`
      })
      t.assert.strictEqual(res.body, payload.toString())
      const length = Buffer.byteLength(payload)
      if (stream) {
        t.assert.deepStrictEqual(writes, [length])
      } else {
        t.assert.strictEqual(res.headers['content-length'], String(length))
        const expected = Array(Math.floor(length / 16384)).fill(16384)
        if (length % 16384) expected.push(length % 16384)
        t.assert.deepStrictEqual(writes, expected)
      }
    })
  }
})

test('http2 plain test', async t => {
  let fastify
  try {
    fastify = Fastify({
      http2: true
    })
    t.assert.ok(true, 'http2 successfully loaded')
  } catch (e) {
    t.assert.fail('http2 loading failed')
  }

  fastify.get('/', function (req, reply) {
    reply.code(200).send(msg)
  })

  fastify.get('/host', function (req, reply) {
    reply.code(200).send(req.host)
  })

  fastify.get('/hostname_port', function (req, reply) {
    reply.code(200).send({ hostname: req.hostname, port: req.port })
  })

  t.after(() => { fastify.close() })

  await fastify.listen({ port: 0 })

  await t.test('http get request', async (t) => {
    t.plan(3)

    const url = `http://localhost:${fastify.server.address().port}`
    const res = await h2url.concat({ url })

    t.assert.strictEqual(res.headers[':status'], 200)
    t.assert.strictEqual(res.headers['content-length'], '' + JSON.stringify(msg).length)

    t.assert.deepStrictEqual(JSON.parse(res.body), msg)
  })

  await t.test('http host', async (t) => {
    t.plan(1)

    const host = `localhost:${fastify.server.address().port}`

    const url = `http://${host}/host`
    const res = await h2url.concat({ url })

    t.assert.strictEqual(res.body, host)
  })
  await t.test('http hostname and port', async (t) => {
    t.plan(2)

    const host = `localhost:${fastify.server.address().port}`

    const url = `http://${host}/hostname_port`
    const res = await h2url.concat({ url })

    t.assert.strictEqual(JSON.parse(res.body).hostname, host.split(':')[0])
    t.assert.strictEqual(JSON.parse(res.body).port, parseInt(host.split(':')[1]))
  })
})
