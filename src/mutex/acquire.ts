import createDebug from 'debug'
import { RedisClient } from '../types'

import { delay } from '../utils'

const debug = createDebug('redis-semaphore:mutex:acquire')

export interface Options {
  identifier: string
  lockTimeout: number
  acquireTimeout: number
  acquireAttemptsLimit: number
  retryInterval: number
}

export async function acquireMutex(
  client: RedisClient,
  key: string,
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
  while (Date.now() < end && ++attempt <= acquireAttemptsLimit) {
    debug(key, identifier, 'attempt', attempt)
    const result = await client.set(key, identifier, 'PX', lockTimeout, 'NX')
    debug('result', typeof result, result)
    if (result === 'OK') {
      debug(key, identifier, 'acquired')
      return true
    } else {
      await delay(retryInterval)
    }
  }
  debug(key, identifier, 'timeout or reach limit')
  return false
}
