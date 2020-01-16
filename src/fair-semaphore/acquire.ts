import createDebug from 'debug'
import { Redis } from 'ioredis'

import { createEval, delay } from '../utils/index'

const debug = createDebug('redis-semaphore:fair-semaphore:acquire')
const acquireLua = createEval(
  `
  redis.call('zremrangebyscore', KEYS[1], '-inf', ARGV[1])
  redis.call('zinterstore', KEYS[2], 2, KEYS[2], KEYS[1], 'WEIGHTS', 1, 0)
  local counter = redis.call('incr', KEYS[3])
  redis.call('zadd', KEYS[1], ARGV[3], ARGV[4])
  redis.call('zadd', KEYS[2], counter, ARGV[4])
  if redis.call('zrank', KEYS[2], ARGV[4]) < tonumber(ARGV[2]) then
    return 1
  end
  redis.call('zrem', KEYS[1], ARGV[4])
  redis.call('zrem', KEYS[2], ARGV[4])
  return nil
  `,
  3
)

export default async function acquireFairSemaphore(
  client: Redis,
  key: string,
  limit: number,
  identifier: string,
  lockTimeout: number,
  acquireTimeout: number,
  retryInterval: number
) {
  const end = Date.now() + acquireTimeout
  let now
  while ((now = Date.now()) < end) {
    debug(key, identifier, limit, lockTimeout)
    const result = await acquireLua(client, [
      key,
      `${key}:owner`,
      `${key}:counter`,
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
