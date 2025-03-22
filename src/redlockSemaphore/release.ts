import createDebug from 'debug'

import type { RedisClient } from '../types'

const debug = createDebug('redis-semaphore:redlock-mutex:release')

export async function releaseRedlockSemaphore(
  clients: RedisClient[],
  key: string,
  identifier: string
): Promise<void> {
  debug(key, identifier)
  const promises = clients.map(client =>
    client.zrem(key, identifier).catch(() => 0)
  )
  const results = await Promise.all(promises)
  debug('results', results)
}
