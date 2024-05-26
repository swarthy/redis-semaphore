import createDebug from 'debug'

import { delIfEqualLua } from '../mutex/release'
import { delay } from '../utils'
import { getQuorum, smartSum } from '../utils/redlock'
import { RedisClient } from '../types'

const debug = createDebug('redis-semaphore:redlock-mutex:acquire')

export interface Options {
  identifier: string
  lockTimeout: number
  acquireTimeout: number
  acquireAttemptsLimit: number
  retryInterval: number
}

export async function acquireRedlockMutex(
  clients: RedisClient[],
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
  const quorum = getQuorum(clients.length)
  while (Date.now() < end && ++attempt <= acquireAttemptsLimit) {
    debug(key, identifier, 'attempt', attempt)
    const promises = clients.map(client =>
      client
        .set(key, identifier, 'PX', lockTimeout, 'NX')
        .then(result => (result === 'OK' ? 1 : 0))
        .catch(() => 0)
    )
    const results = await Promise.all(promises)
    if (results.reduce(smartSum, 0) >= quorum) {
      debug(key, identifier, 'acquired')
      return true
    } else {
      const promises = clients.map(client =>
        delIfEqualLua(client, [key, identifier]).catch(() => 0)
      )
      await Promise.all(promises)
      await delay(retryInterval)
    }
  }
  debug(key, identifier, 'timeout or reach limit')
  return false
}
