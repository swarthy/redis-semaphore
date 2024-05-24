import createDebug from 'debug'
import { RedisClient } from '../types'

import { createEval } from '../utils/index'

const debug = createDebug('redis-semaphore:mutex:refresh')

export const expireIfEqualLua = createEval<[string, string, number], 0 | 1>(
  `
  local key = KEYS[1]
  local identifier = ARGV[1]
  local lockTimeout = ARGV[2]

  local value = redis.call('get', key)

  if value == identifier then
    redis.call('pexpire', key, lockTimeout)
    return 1
  end

  return 0
  `,
  1
)

export async function refreshMutex(
  client: RedisClient,
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
