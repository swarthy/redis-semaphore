import createDebug from 'debug'
import { Redis } from 'ioredis'

import { createEval } from '../utils/index'

const debug = createDebug('redis-semaphore:semaphore:refresh')

const refreshLua = createEval(
  'if redis.call("zscore", KEYS[1], ARGV[1]) then redis.call("zadd", KEYS[1], ARGV[2], ARGV[1]) return 1 end',
  1
)

export default async function refreshSemaphore(
  client: Redis,
  key: string,
  identifier: string
) {
  const now = Date.now()
  debug(key, identifier, now)
  const result = await refreshLua(client, [key, identifier, now])
  debug('result', typeof result, result)
  return result === 1
}
