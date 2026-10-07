'use strict'

const { test } = require('node:test')
const { Readable } = require('node:stream')
const Fastify = require('../..')
const h2url = require('h2url')
const msg = { hello: 'world' }

test('http2 chunks large buffered replies and preserves stream emissions', async t => {
  const chunkSize = 64 * 1024
  const buffer = Buffer.alloc(chunkSize + 1, 'a')
  const cases = [
    { name: 'buffer at the boundary', payload: buffer.subarray(0, chunkSize), body: 'a'.repeat(chunkSize) },
    { name: 'large buffer', payload: buffer, body: buffer.toString(), chunked: true },
    { name: 'multibyte string', payload: '🙂'.repeat(chunkSize / 2), body: '🙂'.repeat(chunkSize / 2), chunked: true },
    { name: 'typed array', payload: new Uint8Array(buffer), body: buffer.toString(), chunked: true },
    { name: 'serialized object', payload: { value: buffer.toString() }, body: JSON.stringify({ value: buffer.toString() }), chunked: true },
    { name: 'user stream', payload: Readable.from([buffer]), body: buffer.toString(), stream: true }
  ]

  for (const { name, payload, body, chunked, stream } of cases) {
    await t.test(name, async t => {
      const fastify = Fastify({ http2: true })
      t.after(() => fastify.close())
      const writes = []
      fastify.get('/', (request, reply) => {
        const write = reply.raw.write
        reply.raw.write = function (chunk, ...args) {
          writes.push(Buffer.byteLength(chunk))
          return write.call(this, chunk, ...args)
        }
        return reply.send(payload)
      })
      await fastify.listen({ port: 0 })
      const res = await h2url.concat({ url: `http://localhost:${fastify.server.address().port}` })

      t.assert.strictEqual(res.body, body)
      if (!stream) {
        t.assert.strictEqual(res.headers['content-length'], String(Buffer.byteLength(body)))
      }
      if (chunked) {
        t.assert.ok(writes.length > 1)
        t.assert.ok(writes.every(size => size <= chunkSize))
      } else {
        t.assert.deepStrictEqual(writes, [Buffer.byteLength(body)])
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
