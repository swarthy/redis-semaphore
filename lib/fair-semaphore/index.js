const TimeoutError = require('../errors/TimeoutError')
const acquireSemaphore = require('./acquire')
const releaseSemaphore = require('./release')
const refreshSemaphore = require('./refresh')
const uuid4 = require('uuid/v4')

function getKey(key) {
  return `semaphore:${key}`
}

async function acquire(
  client,
  key,
  limit,
  lockTimeout,
  acquireTimeout,
  retryInterval
) {
  const identifier = uuid4()
  const finalKey = getKey(key)
  const result = await acquireSemaphore(
    client,
    finalKey,
    limit,
    identifier,
    lockTimeout,
    acquireTimeout,
    retryInterval
  )
  if (result) {
    return identifier
  } else {
    throw new TimeoutError(`Acquire ${key} sempahore timeout`)
  }
}

async function release(client, key, identifier) {
  const finalKey = getKey(key)
  return await releaseSemaphore(client, finalKey, identifier)
}

async function refresh(client, key, identifier) {
  const finalKey = getKey(key)
  return await refreshSemaphore(client, finalKey, identifier)
}

exports.acquire = acquire
exports.release = release
exports.refresh = refresh
