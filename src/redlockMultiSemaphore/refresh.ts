import createDebug from 'debug'
import Redis from 'ioredis'

import { refreshLua } from '../multiSemaphore/refresh/lua'
import { getQuorum, smartSum } from '../utils/redlock'

const debug = createDebug('redis-semaphore:redlock-semaphore:refresh')

interface Options {
  identifier: string
  lockTimeout: number
}

export async function refreshRedlockMultiSemaphore(
  clients: Redis.Redis[],
  key: string,
  limit: number,
  permits: number,
  options: Options
) {
  const { identifier, lockTimeout } = options
  const now = Date.now()
  debug(key, identifier, now)
  const quorum = getQuorum(clients.length)
  const promises = clients.map(client =>
    refreshLua(client, [key, limit, permits, identifier, lockTimeout, now])
      .then(result => +result)
      .catch(() => 0)
  )
  const results = await Promise.all(promises)
  debug('results', results)
  return results.reduce(smartSum, 0) >= quorum
}
