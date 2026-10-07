'use strict'

const { test } = require('node:test')
const errors = require('../../lib/errors')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')

const expectedErrors = 89

test('FST_ERR_ROUTE_LOG_LEVEL_INVALID', t => {
  t.plan(5)
  const error = new errors.FST_ERR_ROUTE_LOG_LEVEL_INVALID()
  t.assert.strictEqual(error.name, 'FastifyError')
  t.assert.strictEqual(error.code, 'FST_ERR_ROUTE_LOG_LEVEL_INVALID')
  t.assert.strictEqual(error.message, "Log level for '%s:%s' route must be a valid logger level. Received: '%s'")
  t.assert.strictEqual(error.statusCode, 500)
  t.assert.ok(error instanceof TypeError)
})
