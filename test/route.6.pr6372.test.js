'use strict'

const stream = require('node:stream')
const { ReadableStream } = require('node:stream/web')
const { test } = require('node:test')
const Fastify = require('..')

test('HEAD route should handle properly each response type', async t => {
  t.plan(24)

  const fastify = Fastify({ exposeHeadRoutes: true })
  const resString = 'Found me!'
  const resJSON = { here: 'is Johnny' }
  const resBuffer = Buffer.from('I am a buffer!')
  const resStream = stream.Readable.from('I am a stream!')
  const resWebStream = ReadableStream.from('I am a web stream!')

  fastify.route({
    method: 'GET',
    path: '/json',
    handler: (req, reply) => {
      reply.send(resJSON)
    }
  })

  fastify.route({
    method: 'GET',
    path: '/string',
    handler: (req, reply) => {
      reply.send(resString)
    }
  })

  fastify.route({
    method: 'GET',
    path: '/buffer',
    handler: (req, reply) => {
      reply.send(resBuffer)
    }
  })

  fastify.route({
    method: 'GET',
    path: '/buffer-with-content-type',
    handler: (req, reply) => {
      reply.headers({ 'content-type': 'image/jpeg' })
      reply.send(resBuffer)
    }
  })

  fastify.route({
    method: 'GET',
    path: '/stream',
    handler: (req, reply) => {
      return resStream
    }
  })

  fastify.route({
    method: 'GET',
    path: '/web-stream',
    handler: (req, reply) => {
      return resWebStream
    }
  })

  let res = await fastify.inject({
    method: 'HEAD',
    url: '/json'
  })
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
  t.assert.strictEqual(res.headers['content-length'], `${Buffer.byteLength(JSON.stringify(resJSON))}`)
  t.assert.deepStrictEqual(res.body, '')

  res = await fastify.inject({
    method: 'HEAD',
    url: '/string'
  })
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.headers['content-type'], 'text/plain; charset=utf-8')
  t.assert.strictEqual(res.headers['content-length'], `${Buffer.byteLength(resString)}`)
  t.assert.strictEqual(res.body, '')

  res = await fastify.inject({
    method: 'HEAD',
    url: '/buffer'
  })
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.headers['content-type'], 'application/octet-stream')
  t.assert.strictEqual(res.headers['content-length'], `${resBuffer.byteLength}`)
  t.assert.strictEqual(res.body, '')

  res = await fastify.inject({
    method: 'HEAD',
    url: '/buffer-with-content-type'
  })
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.headers['content-type'], 'image/jpeg')
  t.assert.strictEqual(res.headers['content-length'], `${resBuffer.byteLength}`)
  t.assert.strictEqual(res.body, '')

  res = await fastify.inject({
    method: 'HEAD',
    url: '/stream'
  })
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.headers['content-type'], undefined)
  t.assert.strictEqual(res.headers['content-length'], undefined)
  t.assert.strictEqual(res.body, '')

  res = await fastify.inject({
    method: 'HEAD',
    url: '/web-stream'
  })
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.headers['content-type'], undefined)
  t.assert.strictEqual(res.headers['content-length'], undefined)
  t.assert.strictEqual(res.body, '')
})
