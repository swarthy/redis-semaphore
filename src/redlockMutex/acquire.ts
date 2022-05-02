import createDebug from 'debug'
import Redis from 'ioredis'

import { delIfEqualLua } from '../mutex/release'
import { delay } from '../utils/index'
import { getQuorum, smartSum } from '../utils/redlock'

const debug = createDebug('redis-semaphore:redlock-mutex:acquire')

export interface Options {
  identifier: string
  lockTimeout: number
  acquireTimeout: number
  retryInterval: number
}

export async function acquireRedlockMutex(
  clients: Redis[],
  key: string,
  options: Options
) {
  const { identifier, lockTimeout, acquireTimeout, retryInterval } = options
  const end = Date.now() + acquireTimeout
  const quorum = getQuorum(clients.length)
  while (Date.now() < end) {
    debug(key, identifier, 'attempt')
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
  debug(key, identifier, 'timeout')
  return false
}
