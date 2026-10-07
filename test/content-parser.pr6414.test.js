'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const keys = require('../lib/symbols')
const { FST_ERR_CTP_ALREADY_PRESENT, FST_ERR_CTP_INVALID_TYPE, FST_ERR_CTP_INVALID_MEDIA_TYPE } = require('../lib/errors')

const first = function (req, payload, done) {}
const second = function (req, payload, done) {}
const third = function (req, payload, done) {}

test('getParser', async t => {
  await t.test('should return matching parser', t => {
    t.plan(7)

    const fastify = Fastify()

    fastify.addContentTypeParser(/^image\/.*/, first)
    fastify.addContentTypeParser(/^application\/.+\+xml/, second)
    fastify.addContentTypeParser('text/html', third)
    fastify.addContentTypeParser('text/html; charset=utf-8', third)

    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('application/t+xml').fn, second)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('image/png').fn, first)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('text/html').fn, third)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('text/html; charset=utf-8').fn, third)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('text/html ; charset=utf-8').fn, third)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('text/html\t; charset=utf-8').fn, third)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('text/htmlINVALID')?.fn, undefined)
  })

  await t.test('should return matching parser with caching /1', t => {
    t.plan(7)

    const fastify = Fastify()

    fastify.addContentTypeParser('text/html', first)

    t.assert.strictEqual(fastify[keys.kContentTypeParser].cache.size, 0)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('text/html').fn, first)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].cache.size, 1)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('text/html ').fn, first)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].cache.size, 1)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('text/html ').fn, first)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].cache.size, 1)
  })

  await t.test('should return matching parser with caching /2', t => {
    t.plan(9)

    const fastify = Fastify()

    fastify.addContentTypeParser('text/html', first)

    t.assert.strictEqual(fastify[keys.kContentTypeParser].cache.size, 0)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('text/html').fn, first)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].cache.size, 1)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('text/HTML').fn, first)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].cache.size, 1)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('TEXT/html').fn, first)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].cache.size, 1)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('TEXT/html').fn, first)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].cache.size, 1)
  })

  await t.test('should return matching parser with caching /3', t => {
    t.plan(6)

    const fastify = Fastify()

    fastify.addContentTypeParser(/^text\/html(;\s*charset=[^;]+)?$/, first)

    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('text/html').fn, first)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].cache.size, 1)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('text/html;charset=utf-8').fn, first)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].cache.size, 2)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('text/html;charset=utf-8').fn, first)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].cache.size, 2)
  })

  await t.test('should prefer content type parser with string value', t => {
    t.plan(2)

    const fastify = Fastify()

    fastify.addContentTypeParser(/^image\/.*/, first)
    fastify.addContentTypeParser('image/gif', second)

    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('image/gif').fn, second)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('image/png').fn, first)
  })

  await t.test('should return parser that catches all if no other is set', t => {
    t.plan(2)

    const fastify = Fastify()

    fastify.addContentTypeParser('*', first)
    fastify.addContentTypeParser(/^text\/.*/, second)

    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('image/gif').fn, first)
    t.assert.strictEqual(fastify[keys.kContentTypeParser].getParser('text/html').fn, second)
  })

  await t.test('should return undefined if no matching parser exist', t => {
    t.plan(2)

    const fastify = Fastify()

    fastify.addContentTypeParser(/^weirdType\/.+/, first)
    fastify.addContentTypeParser('application/javascript', first)

    t.assert.ok(!fastify[keys.kContentTypeParser].getParser('application/xml'))
    t.assert.ok(!fastify[keys.kContentTypeParser].getParser('weirdType/'))
  })
})

test('add', async t => {
  await t.test('should only accept string and RegExp', t => {
    t.plan(4)

    const fastify = Fastify()
    const contentTypeParser = fastify[keys.kContentTypeParser]

    t.assert.ifError(contentTypeParser.add('test/type', {}, first))
    t.assert.ifError(contentTypeParser.add(/test/, {}, first))
    t.assert.throws(
      () => contentTypeParser.add({}, {}, first),
      FST_ERR_CTP_INVALID_TYPE,
      'The content type should be a string or a RegExp'
    )
    t.assert.throws(
      () => contentTypeParser.add(1, {}, first),
      FST_ERR_CTP_INVALID_TYPE,
      'The content type should be a string or a RegExp'
    )
  })

  await t.test('should set "*" as parser that catches all', t => {
    t.plan(1)

    const fastify = Fastify()
    const contentTypeParser = fastify[keys.kContentTypeParser]

    contentTypeParser.add('*', {}, first)
    t.assert.strictEqual(contentTypeParser.customParsers.get('').fn, first)
  })

  await t.test('should lowercase contentTypeParser name', async t => {
    t.plan(1)
    const fastify = Fastify()
    fastify.addContentTypeParser('text/html', function (req, done) {
      done()
    })
    try {
      fastify.addContentTypeParser('TEXT/html', function (req, done) {
        done()
      })
    } catch (err) {
      t.assert.strictEqual(err.message, FST_ERR_CTP_ALREADY_PRESENT('text/html').message)
    }
  })

  await t.test('should trim contentTypeParser name', async t => {
    t.plan(1)
    const fastify = Fastify()
    fastify.addContentTypeParser('text/html', function (req, done) {
      done()
    })
    try {
      fastify.addContentTypeParser('    text/html', function (req, done) {
        done()
      })
    } catch (err) {
      t.assert.strictEqual(err.message, FST_ERR_CTP_ALREADY_PRESENT('text/html').message)
    }
  })
})

test('content-type match parameters - regexp', async t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser(/application\/json; charset="utf8"/, function (request, body, done) {
    t.assert.ok('should be called')
    done(null, body)
  })

  fastify.post('/', async () => {
    return 'ok'
  })

  await fastify.inject({
    method: 'POST',
    path: '/',
    headers: {
      'content-type': 'application/json; charset=utf8'
    },
    body: ''
  })
})

test('content-type fail when not a valid type', async t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.removeAllContentTypeParsers()
  try {
    fastify.addContentTypeParser('type-only', function (request, body, done) {
      t.assert.fail('shouldn\'t be called')
      done(null, body)
    })
  } catch (error) {
    t.assert.equal(error.message, 'The content type should be a string or a RegExp')
  }
})
