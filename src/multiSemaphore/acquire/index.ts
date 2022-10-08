import createDebug from 'debug'
import Redis from 'ioredis'

import { delay } from '../../utils/index'
import { acquireLua } from './lua'

const debug = createDebug('redis-semaphore:multi-semaphore:acquire')

export interface Options {
  identifier: string
  lockTimeout: number
  acquireTimeout: number
  acquireAttemptsLimit: number
  retryInterval: number
}

export async function acquireSemaphore(
  client: Redis,
  key: string,
  limit: number,
  permits: number,
  options: Options
) {
  const {
    identifier,
    lockTimeout,
    acquireTimeout,
    acquireAttemptsLimit,
    retryInterval
  } = options
  let attempt = 0
  const end = Date.now() + acquireTimeout
  let now
  while ((now = Date.now()) < end && ++attempt <= acquireAttemptsLimit) {
    debug(key, identifier, limit, lockTimeout, 'attempt', attempt)
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
  debug(key, identifier, limit, lockTimeout, 'timeout or reach limit')
  return false
}
