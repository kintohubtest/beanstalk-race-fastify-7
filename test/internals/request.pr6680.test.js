'use strict'

const { test } = require('node:test')

const Request = require('../../lib/request')
const Context = require('../../lib/context')
const {
  kReply,
  kRequest,
  kOptions
} = require('../../lib/symbols')

process.removeAllListeners('warning')

test('Request with trust proxy - no x-forwarded-host header and fallback to authority', t => {
  t.plan(3)
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    ':authority': 'authority:4321'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }
  const context = new Context({
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: { type: 'string' }
        }
      }
    },
    config: {
      some: 'config',
      url: req.url,
      method: req.method
    },
    server: {
      [kReply]: {},
      [kRequest]: Request,
      [kOptions]: {
        requestIdLogLabel: 'reqId'
      },
      server: {}
    }
  })

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log', context)
  t.assert.ok(request instanceof TpRequest)
  t.assert.strictEqual(request.host, 'authority:4321')
  t.assert.strictEqual(request.port, 4321)
})

test('Request with trust proxy - x-forwarded-host header has precedence over host', t => {
  t.plan(4)
  const headers = {
    'x-forwarded-for': ' 2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'fastify.test:1234',
    host: 'hostname:5678'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.assert.ok(request instanceof TpRequest)
  t.assert.strictEqual(request.host, 'fastify.test:1234')
  t.assert.strictEqual(request.hostname, 'fastify.test')
  t.assert.strictEqual(request.port, 1234)
})
