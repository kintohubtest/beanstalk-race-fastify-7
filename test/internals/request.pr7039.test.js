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

test('Request with trust proxy - host getter reads the merged headers once', t => {
  t.plan(2)
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers: { host: 'fastify.test' }
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  // the headers getter may allocate a new object once request.headers was
  // assigned in a hook, so the host getter must read it once per access
  const additional = { 'user-assigned': 'yes' }
  let reads = 0
  Object.defineProperty(request, 'headers', {
    get () {
      reads++
      return Object.assign({}, req.headers, additional)
    }
  })
  t.assert.strictEqual(request.host, 'fastify.test')
  t.assert.strictEqual(reads, 1)
})

test('Request with trust proxy - protocol getter reads the merged headers once', t => {
  t.plan(2)
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers: { 'x-forwarded-proto': 'https' }
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  // the headers getter may allocate a new object once request.headers was
  // assigned in a hook, so the protocol getter must read it once per access
  const additional = { 'user-assigned': 'yes' }
  let reads = 0
  Object.defineProperty(request, 'headers', {
    get () {
      reads++
      return Object.assign({}, req.headers, additional)
    }
  })
  t.assert.strictEqual(request.protocol, 'https')
  t.assert.strictEqual(reads, 1)
})
