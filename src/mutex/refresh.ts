import createDebug from 'debug'
import Redis from 'ioredis'

import { createEval } from '../utils/index'

const debug = createDebug('redis-semaphore:mutex:refresh')

export const expireIfEqualLua = createEval(
  `
  local key = KEYS[1]
  local identifier = ARGV[1]
  local lockTimeout = ARGV[2]

  local value = redis.call('get', key)

  if value == identifier then
    redis.call('pexpire', key, lockTimeout)
    return 1
  elseif value == false then
    redis.call('set', key, identifier)
    redis.call('pexpire', key, lockTimeout)
    return 1
  end

  return 0
  `,
  1
)

export async function refreshMutex(
  client: Redis.Redis,
  key: string,
  identifier: string,
  lockTimeout: number
) {
  debug(key, identifier)
  const result = await expireIfEqualLua(client, [key, identifier, lockTimeout])
  debug('result', typeof result, result)

  // support options.stringNumbers
  return +result === 1
}
