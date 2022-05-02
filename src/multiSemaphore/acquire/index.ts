import createDebug from 'debug'
import Redis from 'ioredis'

import { delay } from '../../utils/index'
import { acquireLua } from './lua'

const debug = createDebug('redis-semaphore:multi-semaphore:acquire')

export interface Options {
  identifier: string
  lockTimeout: number
  acquireTimeout: number
  retryInterval: number
}

export async function acquireSemaphore(
  client: Redis,
  key: string,
  limit: number,
  permits: number,
  options: Options
) {
  const { identifier, lockTimeout, acquireTimeout, retryInterval } = options
  const end = Date.now() + acquireTimeout
  let now
  while ((now = Date.now()) < end) {
    debug(key, identifier, limit, lockTimeout)
    const result = await acquireLua(client, [
      key,
      limit,
      permits,
      identifier,
      lockTimeout,
      now
    ])
    debug(key, 'result', typeof result, result)
    if (result === 1) {
      debug(key, identifier, 'acquired')
      return true
    } else {
      await delay(retryInterval)
    }
  }
  return false
}
