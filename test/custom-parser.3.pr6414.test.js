'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const jsonParser = require('fast-json-body')

process.removeAllListeners('warning')

test('catch all content type parser should not interfere with content type parser', async t => {
  t.plan(9)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('*', function (req, payload, done) {
    let data = ''
    payload.on('data', chunk => { data += chunk })
    payload.on('end', () => {
      done(null, data)
    })
  })

  fastify.addContentTypeParser(/^application\/.*/, function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.addContentTypeParser('text/html', function (req, payload, done) {
    let data = ''
    payload.on('data', chunk => { data += chunk })
    payload.on('end', () => {
      done(null, data + 'html')
    })
  })

  const fastifyServer = await fastify.listen({ port: 0 })

  const assertions = [
    { body: '{"myKey":"myValue"}', contentType: 'application/json', expected: JSON.stringify({ myKey: 'myValue' }) },
    { body: 'body', contentType: 'very-weird-content-type/foo', expected: 'body' },
    { body: 'my text', contentType: 'text/html', expected: 'my texthtml' }
  ]

  for (const { body, contentType, expected } of assertions) {
    const response = await fetch(fastifyServer, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': contentType
      }
    })
    t.assert.ok(response.ok)
    t.assert.strictEqual(response.status, 200)
    t.assert.deepStrictEqual(await response.text(), expected)
  }
})
