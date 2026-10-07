'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const { waitForCb } = require('./helper')

test('reports the canonical route url for hidden prefix trailing slash route', async t => {
  t.plan(4)

  const fastify = Fastify({
    ignoreTrailingSlash: false,
    exposeHeadRoutes: false
  })

  const onRouteUrls = []

  fastify.addHook('onRoute', routeOptions => {
    onRouteUrls.push(routeOptions.url)
  })

  fastify.register(async instance => {
    instance.get('/', async request => {
      return request.routeOptions.url
    })

    instance.get('/bar/', async request => {
      return request.routeOptions.url
    })
  }, { prefix: '/prefix' })

  t.assert.strictEqual((await fastify.inject('/prefix')).payload, '/prefix')
  t.assert.strictEqual((await fastify.inject('/prefix/')).payload, '/prefix')
  t.assert.strictEqual((await fastify.inject('/prefix/bar/')).payload, '/prefix/bar/')
  t.assert.deepStrictEqual(onRouteUrls, ['/prefix', '/prefix/bar/'])

  await fastify.close()
})
