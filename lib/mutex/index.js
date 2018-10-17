const TimeoutError = require('../errors/TimeoutError')
const acquireMutex = require('./acquire')
const refreshMutex = require('./refresh')
const releaseMutex = require('./release')
const uuid4 = require('uuid/v4')

function getKey(key) {
  return `mutex:${key}`
}

async function acquire(
  client,
  key,
  lockTimeout,
  acquireTimeout,
  retryInterval
) {
  const identifier = uuid4()
  const finalKey = getKey(key)
  const result = await acquireMutex(
    client,
    finalKey,
    identifier,
    lockTimeout,
    acquireTimeout,
    retryInterval
  )
  if (result) {
    return identifier
  } else {
    throw new TimeoutError(`Acquire mutex ${key} timeout`)
  }
}

async function refresh(client, key, identifier, lockTimeout) {
  const finalKey = getKey(key)
  return await refreshMutex(client, finalKey, identifier, lockTimeout)
}

async function release(client, key, identifier) {
  const finalKey = getKey(key)
  return await releaseMutex(client, finalKey, identifier)
}

exports.acquire = acquire
exports.refresh = refresh
exports.release = release
