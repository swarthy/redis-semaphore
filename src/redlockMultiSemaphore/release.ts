import createDebug from 'debug'
import { RedisClient } from '../types'

import { releaseLua } from '../multiSemaphore/release/lua'

const debug = createDebug('redis-semaphore:redlock-mutex:release')

export async function releaseRedlockMultiSemaphore(
  clients: RedisClient[],
  key: string,
  permits: number,
  identifier: string
) {
  debug(key, identifier)
  const promises = clients.map(client =>
    releaseLua(client, [key, permits, identifier]).catch(() => 0)
  )
  const results = await Promise.all(promises)
  debug('results', results)
}
