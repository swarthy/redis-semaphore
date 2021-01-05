import createDebug from 'debug'
import Redis from 'ioredis'

import { expireIfEqualLua } from '../mutex/refresh'
import { getQuorum, smartSum } from '../utils/redlock'

const debug = createDebug('redis-semaphore:redlock-mutex:refresh')

export async function refreshRedlockMutex(
  clients: Redis.Redis[],
  key: string,
  identifier: string,
  lockTimeout: number
) {
  debug(key, identifier)
  const quorum = getQuorum(clients.length)
  const promises = clients.map(client =>
    expireIfEqualLua(client, [key, identifier, lockTimeout])
      .then(result => +result)
      .catch(() => 0)
  )
  const results = await Promise.all(promises)
  debug('results', results)
  return results.reduce(smartSum, 0) >= quorum
}
