import createDebug from 'debug'
import { Redis } from 'ioredis'

import { createEval } from '../utils/index'

const debug = createDebug('redis-semaphore:mutex:refresh')

const expireIfEqualLua = createEval(
  'if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("pexpire",KEYS[1],ARGV[2]) end',
  1
)

export default async function refreshMutex(
  client: Redis,
  key: string,
  identifier: string,
  lockTimeout: number
) {
  debug(key, identifier)
  const result = await expireIfEqualLua(client, [key, identifier, lockTimeout])
  debug('result', typeof result, result)
  return result === 1
}
