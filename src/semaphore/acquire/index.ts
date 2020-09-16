import createDebug from 'debug'
import Redis from 'ioredis'

import { delay } from '../../utils/index'
import { acquire } from './internal'

const debug = createDebug('redis-semaphore:semaphore:acquire')

export interface Options {
  identifier: string
  lockTimeout: number
  acquireTimeout: number
  retryInterval: number
}

export async function acquireSemaphore(
  client: Redis.Redis | Redis.Cluster,
  key: string,
  limit: number,
  options: Options
) {
  const { identifier, lockTimeout, acquireTimeout, retryInterval } = options
  const end = Date.now() + acquireTimeout
  let now
  while ((now = Date.now()) < end) {
    debug(key, identifier, limit, lockTimeout)
    const internalOptions = {
      identifier,
      lockTimeout,
      now
    }
    const result = await acquire(client, key, limit, internalOptions)
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
