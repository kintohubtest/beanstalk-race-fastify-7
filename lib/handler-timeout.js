'use strict'

const { FST_ERR_HANDLER_TIMEOUT } = require('./errors')
const { kAbortController, kTimeoutTimer, kOnAbort, kTimeoutCleanup, kRouteContext } = require('./symbols')

function getSignal (request, reply) {
  if (request[kAbortController]) return request[kAbortController].signal

  const controller = new AbortController()
  request[kAbortController] = controller
  request[kTimeoutTimer] = null
  request[kOnAbort] = onClose
  request[kTimeoutCleanup] = cleanup

  function cleanup () {
    clearTimeout(request[kTimeoutTimer])
    request[kTimeoutTimer] = null
    reply.raw.removeListener('close', onClose)
    reply.raw.removeListener('finish', cleanup)
    request[kOnAbort] = null
    request[kTimeoutCleanup] = null
  }

  function onClose () {
    cleanup()
    if (!reply.raw.writableFinished) controller.abort()
  }

  if (reply.raw.destroyed) {
    onClose()
  } else if (!reply.sent) {
    reply.raw.once('close', onClose)
    reply.raw.once('finish', cleanup)
  } else {
    cleanup()
  }
  return controller.signal
}

function setupHandlerTimeout (request, reply) {
  getSignal(request, reply)
  if (!request[kTimeoutCleanup]) return
  request[kTimeoutTimer] = setTimeout(() => {
    request[kTimeoutCleanup]?.()
    if (reply.sent || reply.raw.destroyed) return
    const error = new FST_ERR_HANDLER_TIMEOUT()
    // Send through the route error handler before cancellation can resume I/O.
    if (!reply.raw.headersSent) reply.send(error)
    else reply.raw.destroy(error)
    request[kAbortController].abort(error)
  }, request[kRouteContext].handlerTimeout)
  request[kTimeoutTimer].unref()
}

module.exports = { getSignal, setupHandlerTimeout }
