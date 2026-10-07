'use strict'

const split = require('split2')
const { test } = require('node:test')
const querystring = require('node:querystring')
const Fastify = require('../')
const {
  FST_ERR_BAD_URL,
  FST_ERR_ASYNC_CONSTRAINT
} = require('../lib/errors')

test('Should support extra find-my-way options', async t => {
  t.plan(1)
  // Use a real upstream option from find-my-way
  const fastify = Fastify({
    routerOptions: {
      buildPrettyMeta: (route) => {
        const cleanMeta = Object.assign({}, route.store)
        return cleanMeta
      }
    }
  })

  await fastify.ready()

  // Ensure the option is preserved after validation
  t.assert.strictEqual(typeof fastify.initialConfig.routerOptions.buildPrettyMeta, 'function')
})
