'use strict'

const { test, before } = require('node:test')
const Fastify = require('../..')
const helper = require('../helper')
const http = require('node:http')
const pino = require('pino')
const split = require('split2')
const deepClone = require('rfdc')({ circles: true, proto: false })
const { deepFreezeObject } = require('../../lib/initial-config-validation').utils

const { buildCertificate } = require('../build-certificate')

process.removeAllListeners('warning')

let localhost
let localhostForURL

before(async function () {
  await buildCertificate();
  [localhost, localhostForURL] = await helper.getLoopbackHost()
})

test('without options passed to Fastify, initialConfig should expose default values', t => {
  t.plan(1)

  const fastifyDefaultOptions = {
    connectionTimeout: 0,
    keepAliveTimeout: 72000,
    maxRequestsPerSocket: 0,
    requestTimeout: 0,
    handlerTimeout: 0,
    bodyLimit: 1024 * 1024,
    caseSensitive: true,
    allowUnsafeRegex: false,
    disableRequestLogging: false,
    ignoreTrailingSlash: false,
    ignoreDuplicateSlashes: false,
    maxParamLength: 100,
    onProtoPoisoning: 'error',
    onConstructorPoisoning: 'error',
    pluginTimeout: 10000,
    requestIdHeader: false,
    requestIdLogLabel: 'reqId',
    http2SessionTimeout: 72000,
    exposeHeadRoutes: true,
    useSemicolonDelimiter: false
  }

  t.assert.deepStrictEqual(Fastify().initialConfig, fastifyDefaultOptions)
})

test('Should not have issues when passing stream options to Pino.js', (t, done) => {
  t.plan(17)

  const stream = split(JSON.parse)

  const originalOptions = {
    ignoreTrailingSlash: true,
    logger: {
      level: 'trace',
      stream
    }
  }

  let fastify

  try {
    fastify = Fastify(originalOptions)
    fastify.setChildLoggerFactory(function (logger, bindings, opts) {
      bindings.someBinding = 'value'
      return logger.child(bindings, opts)
    })

    t.assert.ok(typeof fastify === 'object')
    t.assert.deepStrictEqual(fastify.initialConfig, {
      connectionTimeout: 0,
      keepAliveTimeout: 72000,
      maxRequestsPerSocket: 0,
      requestTimeout: 0,
      handlerTimeout: 0,
      bodyLimit: 1024 * 1024,
      caseSensitive: true,
      allowUnsafeRegex: false,
      disableRequestLogging: false,
      ignoreTrailingSlash: true,
      ignoreDuplicateSlashes: false,
      maxParamLength: 100,
      onProtoPoisoning: 'error',
      onConstructorPoisoning: 'error',
      pluginTimeout: 10000,
      requestIdHeader: false,
      requestIdLogLabel: 'reqId',
      http2SessionTimeout: 72000,
      exposeHeadRoutes: true,
      useSemicolonDelimiter: false
    })
  } catch (error) {
    t.assert.fail()
  }

  fastify.get('/', function (req, reply) {
    t.assert.ok(req.log)
    reply.send({ hello: 'world' })
  })

  stream.once('data', listenAtLogLine => {
    t.assert.ok(listenAtLogLine, 'listen at log message is ok')

    stream.once('data', line => {
      const id = line.reqId
      t.assert.ok(line.reqId, 'reqId is defined')
      t.assert.strictEqual(line.someBinding, 'value', 'child logger binding is set')
      t.assert.ok(line.req, 'req is defined')
      t.assert.strictEqual(line.msg, 'incoming request', 'message is set')
      t.assert.strictEqual(line.req.method, 'GET', 'method is get')

      stream.once('data', line => {
        t.assert.strictEqual(line.reqId, id)
        t.assert.ok(line.reqId, 'reqId is defined')
        t.assert.strictEqual(line.someBinding, 'value', 'child logger binding is set')
        t.assert.ok(line.res, 'res is defined')
        t.assert.strictEqual(line.msg, 'request completed', 'message is set')
        t.assert.strictEqual(line.res.statusCode, 200, 'statusCode is 200')
        t.assert.ok(line.responseTime, 'responseTime is defined')
      })
    })
  })

  fastify.listen({ port: 0, host: localhost }, err => {
    t.assert.ifError(err)
    t.after(() => { fastify.close() })

    http.get(`http://${localhostForURL}:${fastify.server.address().port}`, () => {
      done()
    })
  })
})
