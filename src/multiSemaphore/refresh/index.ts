import createDebug from 'debug'
import Redis from 'ioredis'

import { refreshLua } from './lua'

const debug = createDebug('redis-semaphore:multi-semaphore:refresh')

export interface Options {
  identifier: string
  lockTimeout: number
}

export async function refreshSemaphore(
  client: Redis.Redis,
  key: string,
  limit: number,
  permits: number,
  options: Options
) {
  const { identifier, lockTimeout } = options
  const now = Date.now()
  debug(key, identifier, now)
  const result = await refreshLua(client, [
    key,
    limit,
    permits,
    identifier,
    lockTimeout,
    now
  ])
  debug('result', typeof result, result)
  return result === 1
}
