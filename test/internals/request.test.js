'use strict'

const { test } = require('node:test')

const Request = require('../../lib/request')
const Context = require('../../lib/context')
const {
  kReply,
  kRequest,
  kOptions,
  kRequestContentType
} = require('../../lib/symbols')

process.removeAllListeners('warning')

test('mediaType is readonly and caches the parsed content type', t => {
  for (const RequestType of [Request, Request.buildRequest(Request), Request.buildRequest(Request, true)]) {
    const request = new RequestType('id', {}, { headers: {} })
    t.assert.strictEqual(request.mediaType, '')
    request[kRequestContentType] = undefined
    request.headers['content-type'] = ' \tApplication/JSON ; charset=utf-8'
    t.assert.strictEqual(request.mediaType, 'application/json')
    const cached = request[kRequestContentType]
    request.headers['content-type'] = 'text/plain'
    t.assert.strictEqual(request.mediaType, 'application/json')
    t.assert.strictEqual(request[kRequestContentType], cached)
    t.assert.throws(() => { request.mediaType = 'text/plain' }, TypeError)
    request[kRequestContentType] = undefined
    t.assert.strictEqual(request.mediaType, 'text/plain')
  }
})

test('Regular request', t => {
  const headers = {
    host: 'hostname'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }
  const context = new Context({
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: { type: 'string' }
        }
      }
    },
    config: {
      some: 'config',
      url: req.url,
      method: req.method
    },
    server: {
      [kReply]: {},
      [kRequest]: Request,
      [kOptions]: {
        requestIdLogLabel: 'reqId'
      },
      server: {}
    }
  })
  req.connection = req.socket
  const request = new Request('id', 'params', req, 'query', 'log', context)
  t.assert.ok(request instanceof Request)
  t.assert.ok(request.validateInput instanceof Function)
  t.assert.ok(request.getValidationFunction instanceof Function)
  t.assert.ok(request.compileValidationSchema instanceof Function)
  t.assert.strictEqual(request.id, 'id')
  t.assert.strictEqual(request.params, 'params')
  t.assert.strictEqual(request.raw, req)
  t.assert.strictEqual(request.query, 'query')
  t.assert.strictEqual(request.headers, headers)
  t.assert.strictEqual(request.log, 'log')
  t.assert.strictEqual(request.ip, 'ip')
  t.assert.strictEqual(request.ips, undefined)
  t.assert.strictEqual(request.host, 'hostname')
  t.assert.strictEqual(request.body, undefined)
  t.assert.strictEqual(request.method, 'GET')
  t.assert.strictEqual(request.url, '/')
  t.assert.strictEqual(request.originalUrl, '/')
  t.assert.strictEqual(request.socket, req.socket)
  t.assert.strictEqual(request.protocol, 'http')
  // Aim to not bad property keys (including Symbols)
  t.assert.ok(!('undefined' in request))
})

test('Request with undefined config', t => {
  const headers = {
    host: 'hostname'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }
  const context = new Context({
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: { type: 'string' }
        }
      }
    },
    server: {
      [kReply]: {},
      [kRequest]: Request,
      [kOptions]: {
        requestIdLogLabel: 'reqId'
      },
      server: {}
    }
  })
  req.connection = req.socket
  const request = new Request('id', 'params', req, 'query', 'log', context)
  t.assert.ok(request, Request)
  t.assert.ok(request.validateInput, Function)
  t.assert.ok(request.getValidationFunction, Function)
  t.assert.ok(request.compileValidationSchema, Function)
  t.assert.strictEqual(request.id, 'id')
  t.assert.strictEqual(request.params, 'params')
  t.assert.strictEqual(request.raw, req)
  t.assert.strictEqual(request.query, 'query')
  t.assert.strictEqual(request.headers, headers)
  t.assert.strictEqual(request.log, 'log')
  t.assert.strictEqual(request.ip, 'ip')
  t.assert.strictEqual(request.ips, undefined)
  t.assert.strictEqual(request.hostname, 'hostname')
  t.assert.strictEqual(request.body, undefined)
  t.assert.strictEqual(request.method, 'GET')
  t.assert.strictEqual(request.url, '/')
  t.assert.strictEqual(request.originalUrl, '/')
  t.assert.strictEqual(request.socket, req.socket)
  t.assert.strictEqual(request.protocol, 'http')

  // Aim to not bad property keys (including Symbols)
  t.assert.ok(!('undefined' in request))
})

test('Regular request - hostname from authority', t => {
  t.plan(3)
  const headers = {
    ':authority': 'authority'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }
  const context = new Context({
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: { type: 'string' }
        }
      }
    },
    config: {
      some: 'config',
      url: req.url,
      method: req.method
    },
    server: {
      [kReply]: {},
      [kRequest]: Request,
      [kOptions]: {
        requestIdLogLabel: 'reqId'
      },
      server: {}
    }
  })

  const request = new Request('id', 'params', req, 'query', 'log', context)
  t.assert.ok(request instanceof Request)
  t.assert.strictEqual(request.host, 'authority')
  t.assert.strictEqual(request.port, null)
})

test('Regular request - host header has precedence over authority', t => {
  t.plan(3)
  const headers = {
    host: 'hostname',
    ':authority': 'authority'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }
  const context = new Context({
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: { type: 'string' }
        }
      }
    },
    config: {
      some: 'config',
      url: req.url,
      method: req.method
    },
    server: {
      [kReply]: {},
      [kRequest]: Request,
      [kOptions]: {
        requestIdLogLabel: 'reqId'
      },
      server: {}
    }
  })
  const request = new Request('id', 'params', req, 'query', 'log', context)
  t.assert.ok(request instanceof Request)
  t.assert.strictEqual(request.host, 'hostname')
  t.assert.strictEqual(request.port, null)
})

test('Request with trust proxy', t => {
  t.plan(18)
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'example.com'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }
  const context = new Context({
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: { type: 'string' }
        }
      }
    },
    config: {
      some: 'config',
      url: req.url,
      method: req.method
    },
    server: {
      [kReply]: {},
      [kRequest]: Request,
      [kOptions]: {
        requestIdLogLabel: 'reqId'
      }
    }
  })

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log', context)
  t.assert.ok(request instanceof TpRequest)
  t.assert.strictEqual(request.id, 'id')
  t.assert.strictEqual(request.params, 'params')
  t.assert.deepStrictEqual(request.raw, req)
  t.assert.strictEqual(request.query, 'query')
  t.assert.strictEqual(request.headers, headers)
  t.assert.strictEqual(request.log, 'log')
  t.assert.strictEqual(request.ip, '2.2.2.2')
  t.assert.deepStrictEqual(request.ips, ['ip', '1.1.1.1', '2.2.2.2'])
  t.assert.strictEqual(request.host, 'example.com')
  t.assert.strictEqual(request.body, undefined)
  t.assert.strictEqual(request.method, 'GET')
  t.assert.strictEqual(request.url, '/')
  t.assert.strictEqual(request.socket, req.socket)
  t.assert.strictEqual(request.protocol, 'http')
  t.assert.ok(request.validateInput instanceof Function)
  t.assert.ok(request.getValidationFunction instanceof Function)
  t.assert.ok(request.compileValidationSchema instanceof Function)
})

test('Request with trust proxy, encrypted', t => {
  t.plan(2)
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'example.com'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip', encrypted: true },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.assert.ok(request instanceof TpRequest)
  t.assert.strictEqual(request.protocol, 'https')
})

test('Request with trust proxy - no x-forwarded-host header', t => {
  t.plan(2)
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    host: 'hostname'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }
  const context = new Context({
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: { type: 'string' }
        }
      }
    },
    config: {
      some: 'config',
      url: req.url,
      method: req.method
    },
    server: {
      [kReply]: {},
      [kRequest]: Request,
      [kOptions]: {
        requestIdLogLabel: 'reqId'
      },
      server: {}
    }
  })

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log', context)
  t.assert.ok(request instanceof TpRequest)
  t.assert.strictEqual(request.host, 'hostname')
})

test('Request with trust proxy - no x-forwarded-host header and fallback to authority', t => {
  t.plan(2)
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    ':authority': 'authority'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }
  const context = new Context({
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: { type: 'string' }
        }
      }
    },
    config: {
      some: 'config',
      url: req.url,
      method: req.method
    },
    server: {
      [kReply]: {},
      [kRequest]: Request,
      [kOptions]: {
        requestIdLogLabel: 'reqId'
      },
      server: {}
    }
  })

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log', context)
  t.assert.ok(request instanceof TpRequest)
  t.assert.strictEqual(request.host, 'authority')
})

test('Request with trust proxy - x-forwarded-host header has precedence over host', t => {
  t.plan(2)
  const headers = {
    'x-forwarded-for': ' 2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'example.com',
    host: 'hostname'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.assert.ok(request instanceof TpRequest)
  t.assert.strictEqual(request.host, 'example.com')
})

test('Request with trust proxy - handles multiple entries in x-forwarded-host/proto', t => {
  t.plan(3)
  const headers = {
    'x-forwarded-host': 'example2.com, example.com',
    'x-forwarded-proto': 'http, https'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.assert.ok(request instanceof TpRequest)
  t.assert.strictEqual(request.host, 'example.com')
  t.assert.strictEqual(request.protocol, 'https')
})

for (const socket of [undefined, null]) {
  test(`Request with trust proxy and ${socket} socket ignores forwarded host/proto`, t => {
    t.plan(2)
    const req = {
      socket,
      headers: {
        host: 'localhost',
        'x-forwarded-host': 'example.com',
        'x-forwarded-proto': 'https'
      }
    }
    const TpRequest = Request.buildRequest(Request, true)
    const request = new TpRequest('id', 'params', req, 'query', 'log')

    t.assert.strictEqual(request.host, 'localhost')
    t.assert.strictEqual(request.protocol, undefined)
  })
}

for (const remoteAddress of [undefined, null, '127.0.0.1', '192.0.2.1']) {
  for (const trustProxy of [1, '127.0.0.1']) {
    test(`Request with trust proxy ${trustProxy} and socket address ${remoteAddress}`, t => {
      const req = {
        socket: { remoteAddress },
        headers: {
          host: 'localhost',
          'x-forwarded-for': '2.2.2.2, 1.1.1.1',
          'x-forwarded-host': 'example.com',
          'x-forwarded-proto': 'https'
        }
      }
      const TpRequest = Request.buildRequest(Request, trustProxy)
      const request = new TpRequest('id', 'params', req, 'query', 'log')
      const trusted = trustProxy === 1 || remoteAddress == null || remoteAddress === '127.0.0.1'

      t.assert.strictEqual(request.host, trusted ? 'example.com' : 'localhost')
      t.assert.strictEqual(request.protocol, trusted ? 'https' : 'http')
      if (trustProxy === 1) {
        t.assert.strictEqual(request.ip, '1.1.1.1')
      }
    })
  }
}

test('Request with trust proxy - plain', t => {
  t.plan(1)
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'example.com'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: { remoteAddress: 'ip' },
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.assert.deepStrictEqual(request.protocol, 'http')
})

test('Request with undefined socket', t => {
  t.plan(18)
  const headers = {
    host: 'hostname'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: undefined,
    headers
  }
  const context = new Context({
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: { type: 'string' }
        }
      }
    },
    config: {
      some: 'config',
      url: req.url,
      method: req.method
    },
    server: {
      [kReply]: {},
      [kRequest]: Request,
      [kOptions]: {
        requestIdLogLabel: 'reqId'
      },
      server: {}
    }
  })
  const request = new Request('id', 'params', req, 'query', 'log', context)
  t.assert.ok(request instanceof Request)
  t.assert.strictEqual(request.id, 'id')
  t.assert.strictEqual(request.params, 'params')
  t.assert.deepStrictEqual(request.raw, req)
  t.assert.strictEqual(request.query, 'query')
  t.assert.strictEqual(request.headers, headers)
  t.assert.strictEqual(request.log, 'log')
  t.assert.strictEqual(request.ip, undefined)
  t.assert.strictEqual(request.ips, undefined)
  t.assert.strictEqual(request.host, 'hostname')
  t.assert.deepStrictEqual(request.body, undefined)
  t.assert.strictEqual(request.method, 'GET')
  t.assert.strictEqual(request.url, '/')
  t.assert.strictEqual(request.protocol, undefined)
  t.assert.deepStrictEqual(request.socket, req.socket)
  t.assert.ok(request.validateInput instanceof Function)
  t.assert.ok(request.getValidationFunction instanceof Function)
  t.assert.ok(request.compileValidationSchema instanceof Function)
})

test('Request with trust proxy and undefined socket', t => {
  t.plan(1)
  const headers = {
    'x-forwarded-for': '2.2.2.2, 1.1.1.1',
    'x-forwarded-host': 'example.com'
  }
  const req = {
    method: 'GET',
    url: '/',
    socket: undefined,
    headers
  }

  const TpRequest = Request.buildRequest(Request, true)
  const request = new TpRequest('id', 'params', req, 'query', 'log')
  t.assert.deepStrictEqual(request.protocol, undefined)
})
