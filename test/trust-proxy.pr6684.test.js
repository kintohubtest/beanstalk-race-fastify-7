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

test('trust proxy does not trust x-forwarded-host/proto when socket is null', t => {
  t.plan(2)

  const headers = {
    host: 'real.test',
    'x-forwarded-host': 'spoofed.test',
    'x-forwarded-proto': 'https'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: null,
    headers
  }

  const TpRequest = buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.assert.strictEqual(request.host, 'real.test', 'falls back to host header')
  t.assert.strictEqual(request.protocol, undefined, 'does not trust x-forwarded-proto')
})
