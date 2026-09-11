import createDebug from 'debug'
import { delIfEqualLua } from '../mutex/release.js'
import { RedisClient } from '../types.js'
import { delay } from '../utils/index.js'
import { getQuorum, smartSum } from '../utils/redlock.js'

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
  options: Options,
  abortSignal?: AbortSignal
): Promise<boolean> {
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
    abortSignal?.throwIfAborted()
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
      await delay(retryInterval, abortSignal)
    }
  }
  debug(key, identifier, 'timeout or reach limit')
  return false
}
