'use strict'

const { test } = require('node:test')
const ContentType = require('../../lib/content-type')
const Fastify = require('../..')

test('content-type parameters preserve case, quoted separators and escapes', t => {
  const parsed = new ContentType('Text/Plain; Boundary="A;B\\"C\\\\D"; boundary=ignored; invalid; charset=utf-8')
  t.assert.equal(parsed.parameters.get('boundary'), 'A;B"C\\D')
  t.assert.equal(parsed.parameters.get('charset'), 'utf-8')
  t.assert.equal(parsed.parameters.size, 2)
  t.assert.deepStrictEqual(new ContentType(parsed.toString()).parameters, parsed.parameters)
})

test('parameterized parsers use the same normalization for registration, lookup and removal', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())
  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser('Text/Plain; Boundary=AbC', { parseAs: 'string' }, (req, body, done) => {
    done(null, req.headers['content-type'])
  })
  t.assert.equal(fastify.hasContentTypeParser('text/plain; boundary="AbC"'), true)
  fastify.post('/', async req => req.body)
  const response = await fastify.inject({
    method: 'POST',
    url: '/',
    headers: { 'content-type': 'TEXT/PLAIN ; boundary=AbC' },
    payload: 'body'
  })
  t.assert.equal(response.statusCode, 200)
  t.assert.equal(response.payload, 'text/plain; boundary="AbC"')

  const other = Fastify()
  t.after(() => other.close())
  other.addContentTypeParser('Text/Plain; Boundary=AbC', () => {})
  other.removeContentTypeParser('text/plain; boundary="AbC"')
  t.assert.equal(other.hasContentTypeParser('Text/Plain; Boundary=AbC'), false)
})

test('catch-all parsers reject malformed media types', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())
  fastify.addContentTypeParser('*', { parseAs: 'string' }, (req, body, done) => done(null, body))
  fastify.post('/', async req => req.body)
  for (const contentType of ['type-only', 'text/', 'text/ plain', 'text/plain extra']) {
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      headers: { 'content-type': contentType },
      payload: 'body'
    })
    t.assert.equal(response.statusCode, 415)
  }
})
