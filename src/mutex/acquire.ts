import createDebug from 'debug'
import Redis from 'ioredis'

import { delay } from '../utils/index'

const debug = createDebug('redis-semaphore:mutex:acquire')

export interface Options {
  identifier: string
  lockTimeout: number
  acquireTimeout: number
  retryInterval: number
}

export async function acquireMutex(
  client: Redis.Redis,
  key: string,
  options: Options
) {
  const { identifier, lockTimeout, acquireTimeout, retryInterval } = options
  const end = Date.now() + acquireTimeout
  while (Date.now() < end) {
    debug(key, identifier, 'attempt')
    const result = await client.set(key, identifier, 'NX', 'PX', lockTimeout)
    debug('result', typeof result, result)
    if (result === 'OK') {
      debug(key, identifier, 'acquired')
      return true
    } else {
      await delay(retryInterval)
    }
  }
  debug(key, identifier, 'timeout')
  return false
}
