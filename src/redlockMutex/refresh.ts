import createDebug from 'debug'
import { expireIfEqualLua } from '../mutex/refresh'
import { delIfEqualLua } from '../mutex/release'
import { RedisClient } from '../types'
import { getQuorum, smartSum } from '../utils/redlock'

const debug = createDebug('redis-semaphore:redlock-mutex:refresh')

export async function refreshRedlockMutex(
  clients: RedisClient[],
  key: string,
  identifier: string,
  lockTimeout: number
): Promise<boolean> {
  debug(key, identifier)
  const quorum = getQuorum(clients.length)
  const promises = clients.map(client =>
    expireIfEqualLua(client, [key, identifier, lockTimeout])
      .then(result => +result)
      .catch(() => 0)
  )
  const results = await Promise.all(promises)
  debug('results', results)
  const refreshedCount = results.reduce(smartSum, 0)
  if (refreshedCount >= quorum) {
    debug(key, identifier, 'refreshed')
    if (refreshedCount < clients.length) {
      debug(key, identifier, 'try to acquire on failed nodes')
      const promises = results
        .reduce<RedisClient[]>((failedClients, result, index) => {
          if (!result) {
            failedClients.push(clients[index])
          }
          return failedClients
        }, [])
        .map(client =>
          client
            .set(key, identifier, 'PX', lockTimeout, 'NX')
            .then(result => (result === 'OK' ? 1 : 0))
            .catch(() => 0)
        )
      const acquireResults = await Promise.all(promises)
      debug(key, identifier, 'acquire on failed nodes results', acquireResults)
    }
    return true
  } else {
    const promises = clients.map(client =>
      delIfEqualLua(client, [key, identifier]).catch(() => 0)
    )
    await Promise.all(promises)
    return false
  }
}
