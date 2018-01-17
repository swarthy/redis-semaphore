const TimeoutError = require('../errors/TimeoutError')
const acquire = require('./acquire')
const release = require('./release')
const uuid4 = require('uuid/v4')

require('../utils/promisifyRedis')

function getKey(key) {
  return `mutex:${key}`
}

async function lock(client, key, lockTimeout, acquireTimeout, retryInterval) {
  const identifier = uuid4()
  const finalKey = getKey(key)
  const result = await acquire(
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
    throw new TimeoutError(`Locking ${key} timeout`)
  }
}

async function unlock(client, key, identifier) {
  const finalKey = getKey(key)
  return await release(client, finalKey, identifier)
}

exports.lock = lock
exports.unlock = unlock
