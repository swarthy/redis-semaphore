import createDebug from 'debug'
import { Redis } from 'ioredis'

import { createEval, delay } from '../utils/index'

const debug = createDebug('redis-semaphore:semaphore:acquire')

const acquireLua = createEval(
  `redis.call('zremrangebyscore', KEYS[1], '-inf', ARGV[1])
  if redis.call('zcard', KEYS[1]) < tonumber(ARGV[2]) then
    redis.call('zadd', KEYS[1], ARGV[3], ARGV[4])
    return 1
  end
  `,
  1
)

export default async function acquireSemaphore(
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
