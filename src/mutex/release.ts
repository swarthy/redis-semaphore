import createDebug from 'debug'
import { Redis } from 'ioredis'

import { createEval } from '../utils/index'

const debug = createDebug('redis-semaphore:mutex:release')

const delIfEqualLua = createEval(
  'if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) end',
  1
)

export default async function releaseMutex(
  client: Redis,
  key: string,
  identifier: string
) {
  debug(key, identifier)
  const result = await delIfEqualLua(client, [key, identifier])
  debug('result', typeof result, result)
  return result === 1
}
