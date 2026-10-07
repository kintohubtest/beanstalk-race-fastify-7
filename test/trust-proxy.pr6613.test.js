'use strict'

const { test, before } = require('node:test')
const fastify = require('..')
const helper = require('./helper')
const Request = require('../lib/request')
const buildRequest = Request.buildRequest

const fetchForwardedRequest = async (fastifyServer, forHeader, path, protoHeader) => {
  const headers = {
    'X-Forwarded-For': forHeader,
    'X-Forwarded-Host': 'fastify.test'
  }
  if (protoHeader) {
    headers['X-Forwarded-Proto'] = protoHeader
  }

  return fetch(fastifyServer + path, {
    headers
  })
}

const testRequestValues = (t, req, options) => {
  if (options.ip) {
    t.assert.ok(req.ip, 'ip is defined')
    t.assert.strictEqual(req.ip, options.ip, 'gets ip from x-forwarded-for')
  }
  if (options.host) {
    t.assert.ok(req.host, 'host is defined')
    t.assert.strictEqual(req.host, options.host, 'gets host from x-forwarded-host')
    t.assert.ok(req.hostname)
    t.assert.strictEqual(req.hostname, options.host, 'gets hostname from x-forwarded-host')
  }
  if (options.ips) {
    t.assert.deepStrictEqual(req.ips, options.ips, 'gets ips from x-forwarded-for')
  }
  if (options.protocol) {
    t.assert.ok(req.protocol, 'protocol is defined')
    t.assert.strictEqual(req.protocol, options.protocol, 'gets protocol from x-forwarded-proto')
  }
  if (options.port) {
    t.assert.ok(req.port, 'port is defined')
    t.assert.strictEqual(req.port, options.port, 'port is taken from x-forwarded-for or host')
  }
}

let localhost
before(async function () {
  [localhost] = await helper.getLoopbackHost()
})

test('trust proxy with number and undefined socket remoteAddress', t => {
  t.plan(3)

  // Test case for issue #6606: trustProxy: 1 with undefined/null socket.remoteAddress
  // This simulates IISNode on Windows where socket.remoteAddress may be undefined
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'fastify.test',
    'x-forwarded-proto': 'https'
  }
  // socket must exist but remoteAddress can be undefined
  // This is what happens in IISNode with enableXFF="true"
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: undefined },
    headers
  }

  const TpRequest = buildRequest(Request, 1)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  // Even with undefined socket.remoteAddress, req.ip should be populated from X-Forwarded-For
  t.assert.ok(request.ip, 'ip is defined')
  // With trustProxy: 1, we trust 1 hop from socket. Since socket.remoteAddress is undefined,
  // the hop count check should skip it and we get 1.1.1.1 (the first trusted address from X-Forwarded-For)
  t.assert.strictEqual(request.ip, '1.1.1.1', 'gets ip from x-forwarded-for')
  // The host should also work correctly
  t.assert.strictEqual(request.host, 'fastify.test', 'gets host from x-forwarded-host')
})

test('trust proxy with number and null socket remoteAddress', t => {
  t.plan(2)

  // Test case for trustProxy: 1 with null socket.remoteAddress
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'fastify.test'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: null },
    headers
  }

  const TpRequest = buildRequest(Request, 1)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.assert.ok(request.ip, 'ip is defined')
  t.assert.strictEqual(request.ip, '1.1.1.1', 'gets ip from x-forwarded-for')
})
