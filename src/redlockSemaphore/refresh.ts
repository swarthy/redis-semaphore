import createDebug from 'debug'
import Redis from 'ioredis'
import { acquireLua } from '../semaphore/acquire/lua'

import { refreshLua } from '../semaphore/refresh/lua'
import { getQuorum, smartSum } from '../utils/redlock'

const debug = createDebug('redis-semaphore:redlock-semaphore:refresh')

interface Options {
  identifier: string
  lockTimeout: number
}

export async function refreshRedlockSemaphore(
  clients: Redis[],
  key: string,
  limit: number,
  options: Options
) {
  const { identifier, lockTimeout } = options
  const now = Date.now()
  debug(key, identifier, now)
  const quorum = getQuorum(clients.length)
  const promises = clients.map(client =>
    refreshLua(client, [key, limit, identifier, lockTimeout, now])
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
        .reduce<Redis[]>((failedClients, result, index) => {
          if (!result) {
            failedClients.push(clients[index])
          }
          return failedClients
        }, [])
        .map(client =>
          acquireLua(client, [key, limit, identifier, lockTimeout, now])
            .then(result => +result)
            .catch(() => 0)
        )
      const acquireResults = await Promise.all(promises)
      debug(key, identifier, 'acquire on failed nodes results', acquireResults)
    }
    return true
  } else {
    const promises = clients.map(client =>
      client.zrem(key, identifier).catch(() => 0)
    )
    await Promise.all(promises)
    return false
  }
}
