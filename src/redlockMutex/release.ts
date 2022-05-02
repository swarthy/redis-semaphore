import createDebug from 'debug'
import Redis from 'ioredis'

import { delIfEqualLua } from '../mutex/release'

const debug = createDebug('redis-semaphore:redlock-mutex:release')

export async function releaseRedlockMutex(
  clients: Redis[],
  key: string,
  identifier: string
) {
  debug(key, identifier)
  const promises = clients.map(client =>
    delIfEqualLua(client, [key, identifier]).catch(() => 0)
  )
  const results = await Promise.all(promises)
  debug('results', results)
}
