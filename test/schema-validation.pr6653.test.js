'use strict'

const { test } = require('node:test')
const Fastify = require('..')

const AJV = require('ajv')
const Schema = require('fluent-json-schema')
const { waitForCb } = require('./toolkit')
const { kRequestContentType } = require('../lib/symbols')

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

test('Schema validation when no content type is provided', async t => {
  // this case should not be happened in normal use-case,
  // it is added for the completeness of code branch
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
    },
    preValidation: async (request) => {
      request.headers['content-type'] = undefined
      request[kRequestContentType] = undefined
    }
  }, async () => 'ok')

  await fastify.ready()

  const invalid = await fastify.inject({
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'application/json'
    },
    body: { invalid: 'string' }
  })
  t.assert.strictEqual(invalid.statusCode, 200)
})
