const debug = require('debug')('redis-semaphore:semaphore:acquire')
const delay = require('../utils/delay')
const createEval = require('../utils/createEval')

const acquireLua = createEval(
  `redis.call('zremrangebyscore', KEYS[1], '-inf', ARGV[1])
  if redis.call('zcard', KEYS[1]) < tonumber(ARGV[2]) then
    redis.call('zadd', KEYS[1], ARGV[3], ARGV[4])
    return 1
  end
  `,
  1
)

async function acquireSemaphore(
  client,
  key,
  limit,
  identifier,
  lockTimeout = 10000,
  acquireTimeout = 10000,
  retryInterval = 10
) {
  const end = Date.now() + acquireTimeout
  let now
  while ((now = Date.now()) < end) {
    debug(key, identifier, limit, lockTimeout)
    const result = await acquireLua(client, [
      key,
      now - lockTimeout,
      limit,
      now,
      identifier
    ])
    debug('result', typeof result, result)
    if (result === 1) {
      debug(key, identifier, 'acquired')
      return true
    } else {
      await delay(retryInterval)
    }
  }
  return false
}

module.exports = acquireSemaphore
