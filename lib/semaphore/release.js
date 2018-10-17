const debug = require('debug')('redis-semaphore:semaphore:release')

async function releaseSemaphore(client, key, identifier) {
  debug(key, identifier)
  const result = await client.zrem(key, identifier)
  debug('result', typeof result, result)
  return result === 1
}

module.exports = releaseSemaphore
