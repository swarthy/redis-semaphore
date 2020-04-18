import createDebug from 'debug'
import { Redis } from 'ioredis'

import { createEval } from '../utils/index'

const debug = createDebug('redis-semaphore:fair-semaphore:refresh')
const refreshLua = createEval(
  `
  local key = KEYS[1]
  local keyOwner = KEYS[2]
  local keyCounter = KEYS[3]
  local identifier = ARGV[1]
  local lockTimeout = tonumber(ARGV[2])
  local now = tonumber(ARGV[3])

  local result = redis.call("zadd", key, now, identifier)

  redis.call('pexpire', key, lockTimeout)
  redis.call('pexpire', keyOwner, lockTimeout)
  redis.call('pexpire', keyCounter, lockTimeout)

  if result == 1 then
    redis.call('zrem', key, identifier)
    redis.call('zrem', keyOwner, identifier)
    return 0
  else
    return 1
  end
  `,
  3
)

export default async function refreshFairSemaphore(
  client: Redis,
  key: string,
  identifier: string,
  lockTimeout: number
) {
  const now = Date.now()
  debug(key, identifier, now)
  const result = await refreshLua(client, [
    key,
    `${key}:owner`,
    `${key}:counter`,
    identifier,
    lockTimeout,
    now
  ])
  debug('result', typeof result, result)
  return result === 1
}
