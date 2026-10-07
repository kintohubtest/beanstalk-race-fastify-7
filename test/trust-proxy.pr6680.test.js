'use strict'

const { test, before } = require('node:test')
const fastify = require('..')
const helper = require('./helper')
const Request = require('../lib/request')
const buildRequest = Request.buildRequest

const fetchForwardedRequest = async (fastifyServer, forHeader, path, protoHeader, hostHeader = 'fastify.test') => {
  const headers = {
    'X-Forwarded-For': forHeader,
    'X-Forwarded-Host': hostHeader
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
  }
  if (options.hostname) {
    t.assert.ok(req.hostname, 'hostname is defined')
    t.assert.strictEqual(req.hostname, options.hostname, 'gets hostname from x-forwarded-host')
  }
  if (options.ips) {
    t.assert.deepStrictEqual(req.ips, options.ips, 'gets ips from x-forwarded-for')
  }
  if (options.protocol) {
    t.assert.ok(req.protocol, 'protocol is defined')
    t.assert.strictEqual(req.protocol, options.protocol, 'gets protocol from x-forwarded-proto')
  }
  if ('port' in options) {
    t.assert.strictEqual(req.port, options.port, 'port is parsed from x-forwarded-host')
  }
}

let localhost
before(async function () {
  [localhost] = await helper.getLoopbackHost()
})

test('trust proxy, not add properties to node req', async t => {
  t.plan(11)
  const app = fastify({
    trustProxy: true
  })
  t.after(() => app.close())

  app.get('/trustproxy', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', host: 'fastify.test:1234', hostname: 'fastify.test', port: 1234 })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })

  app.get('/trustproxychain', function (req, reply) {
    // x-forwarded-host carries no port, so req.port is null
    testRequestValues(t, req, { ip: '2.2.2.2', ips: [localhost, '1.1.1.1', '2.2.2.2'], port: null })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })

  const fastifyServer = await app.listen({ port: 0 })

  await fetchForwardedRequest(fastifyServer, '1.1.1.1', '/trustproxy', undefined, 'fastify.test:1234')
  await fetchForwardedRequest(fastifyServer, '2.2.2.2, 1.1.1.1', '/trustproxychain', undefined)
})

test('trust proxy chain', async t => {
  t.plan(7)
  const app = fastify({
    trustProxy: [localhost, '192.168.1.1']
  })
  t.after(() => app.close())

  app.get('/trustproxychain', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', host: 'fastify.test:1234', hostname: 'fastify.test', port: 1234 })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })

  const fastifyServer = await app.listen({ port: 0 })
  await fetchForwardedRequest(fastifyServer, '192.168.1.1, 1.1.1.1', '/trustproxychain', undefined, 'fastify.test:1234')
})

test('trust proxy function', async t => {
  t.plan(7)
  const app = fastify({
    trustProxy: (address) => address === localhost
  })
  t.after(() => app.close())

  app.get('/trustproxyfunc', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', host: 'fastify.test:1234', hostname: 'fastify.test', port: 1234 })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })

  const fastifyServer = await app.listen({ port: 0 })
  await fetchForwardedRequest(fastifyServer, '1.1.1.1', '/trustproxyfunc', undefined, 'fastify.test:1234')
})

test('trust proxy number', async t => {
  t.plan(8)
  const app = fastify({
    trustProxy: 1
  })
  t.after(() => app.close())

  app.get('/trustproxynumber', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', ips: [localhost, '1.1.1.1'], host: 'fastify.test:1234', hostname: 'fastify.test', port: 1234 })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })

  const fastifyServer = await app.listen({ port: 0 })
  await fetchForwardedRequest(fastifyServer, '2.2.2.2, 1.1.1.1', '/trustproxynumber', undefined, 'fastify.test:1234')
})

test('trust proxy IP addresses', async t => {
  t.plan(8)
  const app = fastify({
    trustProxy: `${localhost}, 2.2.2.2`
  })
  t.after(() => app.close())

  app.get('/trustproxyipaddrs', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', ips: [localhost, '1.1.1.1'], host: 'fastify.test:1234', hostname: 'fastify.test', port: 1234 })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })

  const fastifyServer = await app.listen({ port: 0 })
  await fetchForwardedRequest(fastifyServer, '3.3.3.3, 2.2.2.2, 1.1.1.1', '/trustproxyipaddrs', undefined, 'fastify.test:1234')
})

test('trust proxy protocol', async t => {
  t.plan(27)
  const app = fastify({
    trustProxy: true
  })
  t.after(() => app.close())

  app.get('/trustproxyprotocol', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', protocol: 'lorem', host: 'fastify.test:1234', hostname: 'fastify.test', port: 1234 })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })
  app.get('/trustproxynoprotocol', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', protocol: 'http', host: 'fastify.test:1234', hostname: 'fastify.test', port: 1234 })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })
  app.get('/trustproxyprotocols', function (req, reply) {
    testRequestValues(t, req, { ip: '1.1.1.1', protocol: 'dolor', host: 'fastify.test:1234', hostname: 'fastify.test', port: 1234 })
    reply.code(200).send({ ip: req.ip, host: req.host })
  })

  const fastifyServer = await app.listen({ port: 0 })

  await fetchForwardedRequest(fastifyServer, '1.1.1.1', '/trustproxyprotocol', 'lorem', 'fastify.test:1234')
  await fetchForwardedRequest(fastifyServer, '1.1.1.1', '/trustproxynoprotocol', undefined, 'fastify.test:1234')
  await fetchForwardedRequest(fastifyServer, '1.1.1.1', '/trustproxyprotocols', 'ipsum, dolor', 'fastify.test:1234')
})

test('trust proxy port is null when x-forwarded-host has no port', async t => {
  t.plan(5)
  const app = fastify({
    trustProxy: true
  })
  t.after(() => app.close())

  app.get('/trustproxynoport', function (req, reply) {
    // req.port is derived from req.host; a forwarded host without a port yields null
    testRequestValues(t, req, { host: 'fastify.test', hostname: 'fastify.test', port: null })
    reply.code(200).send({ host: req.host, port: req.port })
  })

  const fastifyServer = await app.listen({ port: 0 })
  await fetchForwardedRequest(fastifyServer, '1.1.1.1', '/trustproxynoport', undefined)
})
