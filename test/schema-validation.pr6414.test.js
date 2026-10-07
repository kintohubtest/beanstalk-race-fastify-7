'use strict'

const { test } = require('node:test')
const Fastify = require('..')

const AJV = require('ajv')
const Schema = require('fluent-json-schema')
const { waitForCb } = require('./toolkit')

const customSchemaCompilers = {
  body: new AJV({
    coerceTypes: false
  }),
  params: new AJV({
    coerceTypes: true
  }),
  querystring: new AJV({
    coerceTypes: true
  })
}

const customValidatorCompiler = req => {
  if (!req.httpPart) {
    throw new Error('Missing httpPart')
  }

  const compiler = customSchemaCompilers[req.httpPart]

  if (!compiler) {
    throw new Error(`Missing compiler for ${req.httpPart}`)
  }

  return compiler.compile(req.schema)
}

const schemaA = {
  $id: 'urn:schema:foo',
  type: 'object',
  definitions: {
    foo: { type: 'integer' }
  },
  properties: {
    foo: { $ref: '#/definitions/foo' }
  }
}
const schemaBRefToA = {
  $id: 'urn:schema:response',
  type: 'object',
  required: ['foo'],
  properties: {
    foo: { $ref: 'urn:schema:foo#/definitions/foo' }
  }
}

const schemaCRefToB = {
  $id: 'urn:schema:request',
  type: 'object',
  required: ['foo'],
  properties: {
    foo: { $ref: 'urn:schema:response#/properties/foo' }
  }
}

const schemaArtist = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    work: { type: 'string' }
  },
  required: ['name', 'work']
}

test('Schema validation will not be bypass by different content type', async t => {
  const fastify = Fastify()

  fastify.post('/', {
    schema: {
      body: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                foo: { type: 'string' }
              },
              required: ['foo'],
              additionalProperties: false
            }
          }
        }
      }
    }
  }, async () => 'ok')

  await fastify.listen({ port: 0 })
  t.after(() => fastify.close())
  const address = fastify.listeningOrigin

  let found = await fetch(address, {
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ foo: 'string' })
  })
  t.assert.strictEqual(found.status, 200)
  await found.bytes()

  found = await fetch(address, {
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({ foo: 'string' })
  })
  t.assert.strictEqual(found.status, 200)
  await found.bytes()

  found = await fetch(address, {
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'application/json\t; charset=utf-8'
    },
    body: JSON.stringify({ foo: 'string' })
  })
  t.assert.strictEqual(found.status, 200)
  await found.bytes()

  found = await fetch(address, {
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'application/json ;'
    },
    body: JSON.stringify({ invalid: 'string' })
  })
  t.assert.strictEqual(found.status, 400)
  t.assert.strictEqual((await found.json()).code, 'FST_ERR_VALIDATION')

  found = await fetch(address, {
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'ApPlIcAtIoN/JsOn;'
    },
    body: JSON.stringify({ invalid: 'string' })
  })
  t.assert.strictEqual(found.status, 400)
  t.assert.strictEqual((await found.json()).code, 'FST_ERR_VALIDATION')

  found = await fetch(address, {
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'ApPlIcAtIoN/JsOn ;'
    },
    body: JSON.stringify({ invalid: 'string' })
  })
  t.assert.strictEqual(found.status, 400)
  t.assert.strictEqual((await found.json()).code, 'FST_ERR_VALIDATION')

  found = await fetch(address, {
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'ApPlIcAtIoN/JsOn foo;'
    },
    body: JSON.stringify({ invalid: 'string' })
  })
  t.assert.strictEqual(found.status, 415)
  t.assert.strictEqual((await found.json()).code, 'FST_ERR_CTP_INVALID_MEDIA_TYPE')

  found = await fetch(address, {
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'ApPlIcAtIoN/JsOn \tfoo;'
    },
    body: JSON.stringify({ invalid: 'string' })
  })
  t.assert.strictEqual(found.status, 415)
  t.assert.strictEqual((await found.json()).code, 'FST_ERR_CTP_INVALID_MEDIA_TYPE')

  found = await fetch(address, {
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'ApPlIcAtIoN/JsOn\t foo;'
    },
    body: JSON.stringify({ invalid: 'string' })
  })
  t.assert.strictEqual(found.status, 415)
  t.assert.strictEqual((await found.json()).code, 'FST_ERR_CTP_INVALID_MEDIA_TYPE')

  found = await fetch(address, {
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'ApPlIcAtIoN/JsOn \t'
    },
    body: JSON.stringify({ invalid: 'string' })
  })
  t.assert.strictEqual(found.status, 400)
  t.assert.strictEqual((await found.json()).code, 'FST_ERR_VALIDATION')

  found = await fetch(address, {
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'ApPlIcAtIoN/JsOn\t'
    },
    body: JSON.stringify({ invalid: 'string' })
  })
  t.assert.strictEqual(found.status, 400)
  t.assert.strictEqual((await found.json()).code, 'FST_ERR_VALIDATION')

  found = await fetch(address, {
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'ApPlIcAtIoN/JsOn\ta'
    },
    body: JSON.stringify({ invalid: 'string' })
  })
  t.assert.strictEqual(found.status, 415)
  t.assert.strictEqual((await found.json()).code, 'FST_ERR_CTP_INVALID_MEDIA_TYPE')

  found = await fetch(address, {
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'ApPlIcAtIoN/JsOn\ta; charset=utf-8'
    },
    body: JSON.stringify({ invalid: 'string' })
  })
  t.assert.strictEqual(found.status, 415)
  t.assert.strictEqual((await found.json()).code, 'FST_ERR_CTP_INVALID_MEDIA_TYPE')

  found = await fetch(address, {
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'application/ json'
    },
    body: JSON.stringify({ invalid: 'string' })
  })
  t.assert.strictEqual(found.status, 415)
  t.assert.strictEqual((await found.json()).code, 'FST_ERR_CTP_INVALID_MEDIA_TYPE')
})
