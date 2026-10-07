'use strict'

const net = require('node:net')
const http = require('node:http')
const { test } = require('node:test')
const Fastify = require('..')
const { Client } = require('undici')
const split = require('split2')
const { sleep } = require('./helper')

const server = http.createServer()
const noSupport = typeof server.closeAllConnections !== 'function'

test('preClose runs exactly once with a child plugin', async t => {
  t.plan(1)
  const fastify = Fastify()
  let count = 0

  fastify.register(async (child) => {
    child.get('/x', async () => 'ok')
  })
  fastify.addHook('preClose', async () => { count++ })

  await fastify.ready()
  await fastify.close()

  t.assert.strictEqual(count, 1)
})

test('preClose runs exactly once with nested child plugins', async t => {
  t.plan(1)
  const fastify = Fastify()
  let count = 0

  fastify.register(async (child) => {
    child.register(async (grandchild) => {
      grandchild.get('/y', async () => 'ok')
    })
  })
  fastify.addHook('preClose', async () => { count++ })

  await fastify.ready()
  await fastify.close()

  t.assert.strictEqual(count, 1)
})
