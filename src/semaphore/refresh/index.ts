import createDebug from 'debug'
import Redis from 'ioredis'

import { refresh } from './internal'

const debug = createDebug('redis-semaphore:semaphore:refresh')

export async function refreshSemaphore(
  client: Redis.Redis | Redis.Cluster,
  key: string,
  identifier: string,
  lockTimeout: number
) {
  const now = Date.now()
  debug(key, identifier, now)
  const internalOptions = {
    identifier,
    lockTimeout,
    now
  }
  const result = await refresh(client, key, internalOptions)
  debug('result', typeof result, result)
  return result === 1
}
