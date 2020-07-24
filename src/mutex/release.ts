import createDebug from 'debug'
import Redis from 'ioredis'

import { createEval } from '../utils/index'

const debug = createDebug('redis-semaphore:mutex:release')

const delIfEqualLua = createEval(
  `
  local key = KEYS[1]
  local identifier = ARGV[1]

  if redis.call('get', key) == identifier then
    return redis.call('del', key)
  end`,
  1
)

export default async function releaseMutex(
  client: Redis.Redis | Redis.Cluster,
  key: string,
  identifier: string
) {
  debug(key, identifier)
  const result = await delIfEqualLua(client, [key, identifier])
  debug('result', typeof result, result)
}
