'use strict'

const fs = require('node:fs')
const { test } = require('node:test')
const Fastify = require('../fastify')
const jsonParser = require('fast-json-body')
const { plainTextParser } = require('./helper')

process.removeAllListeners('warning')

test('catch all content type parser', async (t) => {
  t.plan(6)
  const fastify = Fastify()

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

  const fastifyServer = await fastify.listen({ port: 0 })
  t.after(() => fastify.close())

  const result1 = await fetch(fastifyServer, {
    method: 'POST',
    body: 'hello',
    headers: {
      'Content-Type': 'application/jsoff'
    }
  })

  t.assert.ok(result1.ok)
  t.assert.strictEqual(result1.status, 200)
  t.assert.strictEqual(await result1.text(), 'hello')

  const result2 = await fetch(fastifyServer, {
    method: 'POST',
    body: 'hello',
    headers: {
      'Content-Type': 'very-weird-content-type/foo'
    }
  })

  t.assert.ok(result2.ok)
  t.assert.strictEqual(result2.status, 200)
  t.assert.strictEqual(await result2.text(), 'hello')
})

test('catch all content type parser should not interfere with other content type parsers', async (t) => {
  t.plan(6)
  const fastify = Fastify()

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

  fastify.addContentTypeParser('application/jsoff', function (req, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  const fastifyServer = await fastify.listen({ port: 0 })
  t.after(() => fastify.close())

  const result1 = await fetch(fastifyServer, {
    method: 'POST',
    body: '{"hello":"world"}',
    headers: {
      'Content-Type': 'application/jsoff'
    }
  })

  t.assert.ok(result1.ok)
  t.assert.strictEqual(result1.status, 200)
  t.assert.deepStrictEqual(await result1.json(), { hello: 'world' })

  const result2 = await fetch(fastifyServer, {
    method: 'POST',
    body: 'hello',
    headers: {
      'Content-Type': 'very-weird-content-type/foo'
    }
  })

  t.assert.ok(result2.ok)
  t.assert.strictEqual(result2.status, 200)
  t.assert.strictEqual(await result2.text(), 'hello')
})
