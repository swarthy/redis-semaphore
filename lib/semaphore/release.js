const debug = require('debug')('redis-semaphore:semaphore:release')
const createEval = require('../utils/createEval')

const releaseLua = createEval(
  `
  redis.call('zrem', KEYS[1], ARGV[1])
  redis.call('zrem', KEYS[2], ARGV[1])
  return 1
  `,
  2
)

async function releaseSemaphore(client, key, identifier) {
  debug(key, identifier)
  const result = await releaseLua(client, [
    key,
    `${key}:owner`,
    identifier
  ])
  debug('result', typeof result, result)
  return result === 1
}

module.exports = releaseSemaphore
