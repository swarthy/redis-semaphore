import createDebug from 'debug'
import Redis from 'ioredis'

import { delay } from '../utils/index'

const debug = createDebug('redis-semaphore:mutex:acquire')

export default async function acquireMutex(
  client: Redis.Redis | Redis.Cluster,
  key: string,
  identifier: string,
  lockTimeout: number,
  acquireTimeout: number,
  retryInterval: number
) {
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
