import createDebug from 'debug'
import Redis from 'ioredis'

import { createEval, delay } from '../utils/index'

const debug = createDebug('redis-semaphore:fair-semaphore:acquire')
const acquireLua = createEval(
  `
  local key = KEYS[1]
  local keyOwner = KEYS[2]
  local keyCounter = KEYS[3]
  local limit = tonumber(ARGV[1])
  local identifier = ARGV[2]
  local lockTimeout = tonumber(ARGV[3])
  local now = tonumber(ARGV[4])
  local expiredTimestamp = now - lockTimeout
  local expireAt = now + lockTimeout

  redis.call('zremrangebyscore', key, '-inf', expiredTimestamp)
  redis.call('zinterstore', keyOwner, 2, keyOwner, key, 'WEIGHTS', 1, 0)
  local counter = redis.call('incr', keyCounter)
  redis.call('zadd', key, now, identifier)
  redis.call('zadd', keyOwner, counter, identifier)
  redis.call('pexpireat', key, expireAt)
  redis.call('pexpireat', keyOwner, expireAt)
  redis.call('pexpireat', keyCounter, expireAt)
  if redis.call('zrank', keyOwner, identifier) < limit then
    return 1
  else
    redis.call('zrem', key, identifier)
    redis.call('zrem', keyOwner, identifier)
    return 0
  end
  `,
  3
)

export default async function acquireFairSemaphore(
  client: Redis.Redis | Redis.Cluster,
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
