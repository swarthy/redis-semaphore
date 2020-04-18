import createDebug from 'debug'
import { Redis } from 'ioredis'

import { createEval } from '../utils/index'

const debug = createDebug('redis-semaphore:semaphore:refresh')

const refreshLua = createEval(
  `
  local key = KEYS[1]
  local id = ARGV[1]
  local lockTimeout = ARGV[2]
  local now = ARGV[3]
  if redis.call('zscore', key, id) then
    redis.call('zadd', key, now, id)
    redis.call('pexpire', key, lockTimeout)
    return 1
  else
    return 0
  end`,
  1
)

export default async function refreshSemaphore(
  client: Redis,
  key: string,
  identifier: string,
  lockTimeout: number
) {
  const now = Date.now()
  debug(key, identifier, now)
  const result = await refreshLua(client, [key, identifier, lockTimeout, now])
  debug('result', typeof result, result)
  return result === 1
}
