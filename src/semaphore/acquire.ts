import createDebug from 'debug'
import { Redis } from 'ioredis'

import { createEval, delay } from '../utils/index'

const debug = createDebug('redis-semaphore:semaphore:acquire')

const acquireLua = createEval(
  `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local id = ARGV[2]
  local lockTimeout = tonumber(ARGV[3])
  local now = tonumber(ARGV[4])
  local expiredTimestamp = now - lockTimeout

  redis.call('zremrangebyscore', key, '-inf', expiredTimestamp)
  if redis.call('zcard', key) < limit then
    redis.call('zadd', key, now, id)
    redis.call('pexpire', key, lockTimeout)
    return 1
  else
    return 0
  end`,
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
      limit,
      identifier,
      lockTimeout,
      now
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
