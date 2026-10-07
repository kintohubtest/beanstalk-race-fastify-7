'use strict'

const { describe, test } = require('node:test')
const ContentType = require('../lib/content-type')
const Fastify = require('..')

describe('ContentType class', () => {
  test('returns empty instance for empty value', (t) => {
    let found = new ContentType('')
    t.assert.equal(found.isEmpty, true)

    found = new ContentType('undefined')
    t.assert.equal(found.isEmpty, true)

    found = new ContentType()
    t.assert.equal(found.isEmpty, true)
  })

  test('indicates media type is not correct format', (t) => {
    let found = new ContentType('foo')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.isValid, false)

    found = new ContentType('foo /bar')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.isValid, false)

    found = new ContentType('foo/ bar')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.isValid, false)

    found = new ContentType('foo; param=1')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.isValid, false)

    found = new ContentType('foo/π; param=1')
    t.assert.equal(found.isEmpty, true)
    t.assert.equal(found.isValid, false)
  })

  test('returns a plain media type instance', (t) => {
    const found = new ContentType('Application/JSON')
    t.assert.equal(found.mediaType, 'application/json')
    t.assert.equal(found.type, 'application')
    t.assert.equal(found.subtype, 'json')
    t.assert.equal(found.parameters.size, 0)
  })

  test('handles empty parameters list', (t) => {
    const found = new ContentType('Application/JSON ;')
    t.assert.equal(found.isEmpty, false)
    t.assert.equal(found.mediaType, 'application/json')
    t.assert.equal(found.type, 'application')
    t.assert.equal(found.subtype, 'json')
    t.assert.equal(found.parameters.size, 0)
  })

  test('returns a media type instance with parameters', (t) => {
    const found = new ContentType('Application/JSON ; charset=utf-8; foo=BaR;baz=" 42"')
    t.assert.equal(found.isEmpty, false)
    t.assert.equal(found.mediaType, 'application/json')
    t.assert.equal(found.type, 'application')
    t.assert.equal(found.subtype, 'json')
    t.assert.equal(found.parameters.size, 3)

    const expected = [
      ['charset', 'utf-8'],
      ['foo', 'BaR'],
      ['baz', ' 42']
    ]
    t.assert.deepStrictEqual(
      Array.from(found.parameters.entries()),
      expected
    )

    t.assert.equal(
      found.toString(),
      'application/json; charset="utf-8"; foo="BaR"; baz=" 42"'
    )
  })

  test('skips invalid quoted string parameters', (t) => {
    const found = new ContentType('Application/JSON ; charset=utf-8; foo=BaR;baz=" 42')
    t.assert.equal(found.isEmpty, false)
    t.assert.equal(found.mediaType, 'application/json')
    t.assert.equal(found.type, 'application')
    t.assert.equal(found.subtype, 'json')
    t.assert.equal(found.parameters.size, 3)

    const expected = [
      ['charset', 'utf-8'],
      ['foo', 'BaR'],
      ['baz', 'invalid quoted string']
    ]
    t.assert.deepStrictEqual(
      Array.from(found.parameters.entries()),
      expected
    )

    t.assert.equal(
      found.toString(),
      'application/json; charset="utf-8"; foo="BaR"; baz="invalid quoted string"'
    )
  })
})
