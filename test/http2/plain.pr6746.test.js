'use strict'

const { test } = require('node:test')
const http2 = require('node:http2')
const Fastify = require('../..')
const h2url = require('h2url')
const msg = { hello: 'world' }

test('http2 large non-stream replies are sent completely', async t => {
  const modes = ['buffer', 'string']

  for (const mode of modes) {
    await t.test(mode, async t => {
      const fastify = Fastify({ http2: true })
      const payload = mode === 'buffer'
        ? Buffer.alloc((64 * 1024) + 1, 'a')
        : 'a'.repeat((64 * 1024) + 1)
      const contentLength = Buffer.byteLength(payload)

      fastify.get('/large', async (req, reply) => {
        reply.header('content-type', 'application/octet-stream')
        reply.header('content-length', contentLength)

        return payload
      })

      await fastify.listen({ port: 0, host: '127.0.0.1' })

      const client = http2.connect(`http://127.0.0.1:${fastify.server.address().port}`)
      t.after(() => {
        client.close()
        return fastify.close()
      })

      await new Promise((resolve, reject) => {
        const large = client.request({
          [http2.constants.HTTP2_HEADER_METHOD]: http2.constants.HTTP2_METHOD_GET,
          [http2.constants.HTTP2_HEADER_PATH]: '/large'
        })
        const chunks = []

        large.on('error', reject)
        large.on('data', chunk => {
          chunks.push(chunk)
        })
        large.on('end', () => {
          t.assert.strictEqual(Buffer.concat(chunks).length, contentLength)
          resolve()
        })
        large.end()
      })
    })
  }
})

test('http2 large buffer replies can be cancelled without rejecting the next stream', async t => {
  const fastify = Fastify({ http2: true })
  const payload = Buffer.alloc(32 * 1024 * 1024, 'a')
  let smallHit = false

  fastify.get('/large', async (req, reply) => {
    reply.header('content-type', 'application/octet-stream')
    reply.header('content-length', payload.length)

    return payload
  })

  fastify.get('/small', async () => {
    smallHit = true
    return 'ok'
  })

  await fastify.listen({ port: 0, host: '127.0.0.1' })

  const client = http2.connect(`http://127.0.0.1:${fastify.server.address().port}`)
  t.after(() => {
    client.close()
    return fastify.close()
  })

  await new Promise((resolve, reject) => {
    let cancelTimer
    let requestTimer
    let timeout

    function cleanup () {
      clearTimeout(cancelTimer)
      clearTimeout(requestTimer)
      clearTimeout(timeout)
    }

    const large = client.request({
      [http2.constants.HTTP2_HEADER_METHOD]: http2.constants.HTTP2_METHOD_GET,
      [http2.constants.HTTP2_HEADER_PATH]: '/large'
    })
    let largeResponded = false

    large.on('error', err => {
      if (!largeResponded) {
        cleanup()
        reject(err)
      }
    })
    large.on('response', () => {
      largeResponded = true
      large.pause()
      cancelTimer = setTimeout(() => {
        large.close(http2.constants.NGHTTP2_CANCEL)
      }, 100)
      requestTimer = setTimeout(() => {
        const small = client.request({
          [http2.constants.HTTP2_HEADER_METHOD]: http2.constants.HTTP2_METHOD_GET,
          [http2.constants.HTTP2_HEADER_PATH]: '/small'
        })
        let body = ''

        timeout = setTimeout(() => {
          cleanup()
          reject(new Error('timed out waiting for /small response'))
        }, 3000)

        small.setEncoding('utf8')
        small.on('error', err => {
          cleanup()
          reject(err)
        })
        small.on('data', chunk => {
          body += chunk
        })
        small.on('end', () => {
          cleanup()
          t.assert.strictEqual(body, 'ok')
          t.assert.strictEqual(smallHit, true)
          resolve()
        })
        small.end()
      }, 200)
    })
    large.end()
  })
})
