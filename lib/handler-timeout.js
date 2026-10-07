'use strict'

const { kTimeoutTimer, kOnAbort, kRequestAbortController, kRouteContext } = require('./symbols')
const { FST_ERR_HANDLER_TIMEOUT } = require('./errors')

function getRequestSignal (request, reply) {
  if (request[kRequestAbortController]) return request[kRequestAbortController].signal

  const controller = new AbortController()
  request[kRequestAbortController] = controller
  request[kTimeoutTimer] = null

  const response = reply.raw
  const cleanup = () => {
    clearTimeout(request[kTimeoutTimer])
    request[kTimeoutTimer] = null
    request[kOnAbort] = null
    response.removeListener('finish', cleanup)
    response.removeListener('error', cleanup)
    response.removeListener('close', onClose)
  }
  const onClose = () => {
    cleanup()
    if (!response.writableFinished) controller.abort()
  }

  request[kOnAbort] = cleanup
  if (response.destroyed) {
    onClose()
  } else if (reply.sent) {
    cleanup()
  } else {
    response.once('finish', cleanup)
    response.once('error', cleanup)
    response.once('close', onClose)
  }
  return controller.signal
}

function setupHandlerTimeout (request, reply) {
  getRequestSignal(request, reply)
  if (!request[kOnAbort]) return

  request[kTimeoutTimer] = setTimeout(() => {
    request[kOnAbort]()
    if (reply.sent || reply.raw.destroyed) return

    const error = new FST_ERR_HANDLER_TIMEOUT()
    // Send first so synchronous abort listeners cannot replace the timeout response.
    if (reply.raw.headersSent) {
      reply.raw.destroy()
    } else {
      reply.send(error)
    }
    request[kRequestAbortController].abort(error)
  }, request[kRouteContext].handlerTimeout)
}

module.exports = { getRequestSignal, setupHandlerTimeout }
