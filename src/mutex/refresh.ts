import createDebug from 'debug'
import Redis from 'ioredis'

import { createEval } from '../utils/index'

const debug = createDebug('redis-semaphore:mutex:refresh')

const expireIfEqualLua = createEval(
  `
  local key = KEYS[1]
  local identifier = ARGV[1]
  local lockTimeout = ARGV[2]

  if redis.call('get', key) == identifier then
    return redis.call('pexpire', key, lockTimeout)
  end`,
  1
)

export async function refreshMutex(
  client: Redis.Redis | Redis.Cluster,
  key: string,
  identifier: string,
  lockTimeout: number
) {
  debug(key, identifier)
  const result = await expireIfEqualLua(client, [key, identifier, lockTimeout])
  debug('result', typeof result, result)
  return result === 1
}
