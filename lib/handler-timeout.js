'use strict'

const { kAbortController, kTimeoutTimer, kOnAbort, kOnFinish, kRouteContext } = require('./symbols')
const { FST_ERR_HANDLER_TIMEOUT } = require('./errors')

function cleanupHandlerTimeout (request, reply) {
  if (!request[kOnAbort]) return
  clearTimeout(request[kTimeoutTimer])
  request[kTimeoutTimer] = null
  reply.raw.removeListener('close', request[kOnAbort])
  reply.raw.removeListener('finish', request[kOnFinish])
  reply.raw.removeListener('error', request[kOnAbort])
  request[kOnAbort] = null
  request[kOnFinish] = null
}

function setupRequestSignal (request, reply) {
  const controller = new AbortController()
  request[kAbortController] = controller
  request[kTimeoutTimer] = null
  request[kOnAbort] = null
  if (reply.sent) return controller
  if (reply.raw.destroyed) {
    controller.abort()
    return controller
  }
  request[kOnAbort] = () => {
    cleanupHandlerTimeout(request, reply)
    if (!reply.raw.writableFinished) controller.abort()
  }
  reply.raw.on('close', request[kOnAbort])
  request[kOnFinish] = () => cleanupHandlerTimeout(request, reply)
  reply.raw.on('finish', request[kOnFinish])
  reply.raw.on('error', request[kOnAbort])
  return controller
}

function setupHandlerTimeout (request, reply) {
  const controller = setupRequestSignal(request, reply)
  if (controller.signal.aborted) return
  request[kTimeoutTimer] = setTimeout(() => {
    cleanupHandlerTimeout(request, reply)
    if (reply.sent || reply.raw.destroyed) return
    const error = new FST_ERR_HANDLER_TIMEOUT()
    controller.abort(error)
    // Once streaming has started, another response cannot be sent.
    if (reply.raw.headersSent) {
      reply.raw.destroy(error)
    } else {
      reply.send(error)
    }
  }, request[kRouteContext].handlerTimeout)
}

module.exports = { setupHandlerTimeout, setupRequestSignal, cleanupHandlerTimeout }
