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

  t.after(() => fastify.close())

  await fastify.ready()

  // Ensure the option is preserved after validation
  t.assert.strictEqual(typeof fastify.initialConfig.routerOptions.buildPrettyMeta, 'function')
})

test('Should allow reusing a routerOptions object across instances', async t => {
  t.plan(1)

  const options = {
    routerOptions: {
      maxParamLength: 2048
    }
  }

  const app1 = Fastify(options)
  const app2 = Fastify(options)

  t.after(() => Promise.all([
    app1.close(),
    app2.close()
  ]))

  const response = await app2.inject('/not-found')
  t.assert.strictEqual(response.statusCode, 404)
})

test('Should not mutate user-provided routerOptions object', async t => {
  t.plan(4)

  const routerOptions = {
    maxParamLength: 2048
  }
  const options = { routerOptions }

  const app = Fastify(options)
  t.after(() => app.close())

  await app.ready()

  t.assert.deepStrictEqual(Object.keys(routerOptions), ['maxParamLength'])
  t.assert.strictEqual(routerOptions.maxParamLength, 2048)
  t.assert.strictEqual(routerOptions.defaultRoute, undefined)
  t.assert.strictEqual(routerOptions.onBadUrl, undefined)
})
