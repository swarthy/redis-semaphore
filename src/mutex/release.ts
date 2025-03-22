import createDebug from 'debug'
import { createEval } from '../utils/index'

import type { RedisClient } from '../types'

const debug = createDebug('redis-semaphore:mutex:release')

export const delIfEqualLua = createEval<[string, string], 0 | 1>(
  `
  local key = KEYS[1]
  local identifier = ARGV[1]

  if redis.call('get', key) == identifier then
    return redis.call('del', key)
  end

  return 0
  `,
  1
)

export async function releaseMutex(
  client: RedisClient,
  key: string,
  identifier: string
): Promise<void> {
  debug(key, identifier)
  const result = await delIfEqualLua(client, [key, identifier])
  debug('result', typeof result, result)
}
