const { sep } = require('node:path')
const { test } = require('node:test')
const Fastify = require('../../fastify')
const { kSchemaController } = require('../../lib/symbols')

test('isCustomSerializerCompiler flag is set correctly when only buildSerializer is provided', async t => {
  const app = Fastify({
    schemaController: {
      compilersFactory: {
        buildSerializer: () => () => { }
      }
    }
  })

  await app.ready()

  const schemaController = app[kSchemaController]
  t.assert.equal(schemaController.isCustomValidatorCompiler, false, 'isCustomValidatorCompiler should be false')
  t.assert.equal(schemaController.isCustomSerializerCompiler, true, 'isCustomSerializerCompiler should be true')
})

test('isCustomValidatorCompiler flag is set correctly when only buildValidator is provided', async t => {
  const app = Fastify({
    schemaController: {
      compilersFactory: {
        buildValidator: () => () => { }
      }
    }
  })

  await app.ready()

  const schemaController = app[kSchemaController]
  t.assert.equal(schemaController.isCustomValidatorCompiler, true, 'isCustomValidatorCompiler should be true')
  t.assert.equal(schemaController.isCustomSerializerCompiler, false, 'isCustomSerializerCompiler should be false')
})
