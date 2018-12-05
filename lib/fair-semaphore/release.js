const debug = require('debug')('redis-semaphore:fair-semaphore:release')
const createEval = require('../utils/createEval')

const releaseLua = createEval(
  `
  local removed = redis.call('zrem', KEYS[1], ARGV[1])
  redis.call('zrem', KEYS[2], ARGV[1])
  return removed
  `,
  2
)

async function releaseFairSemaphore(client, key, identifier) {
  debug(key, identifier)
  const result = await releaseLua(client, [key, `${key}:owner`, identifier])
  debug('result', typeof result, result)
  return result === 1
}

module.exports = releaseFairSemaphore
