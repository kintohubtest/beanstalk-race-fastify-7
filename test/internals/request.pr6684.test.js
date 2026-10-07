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

test('Request with trust proxy and undefined socket does not trust x-forwarded-host/proto', t => {
  t.plan(2)
  const headers = {
    host: 'hostname',
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'fastify.test',
    'x-forwarded-proto': 'https'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: undefined,
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.assert.strictEqual(request.host, 'hostname')
  t.assert.deepStrictEqual(request.protocol, undefined)
})

test('Request with trust proxy and null socket does not trust x-forwarded-host/proto', t => {
  t.plan(2)
  const headers = {
    host: 'hostname',
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'fastify.test',
    'x-forwarded-proto': 'https'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: null,
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.assert.strictEqual(request.host, 'hostname')
  t.assert.deepStrictEqual(request.protocol, undefined)
})
