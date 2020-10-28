import createDebug from 'debug'
import Redis from 'ioredis'

import { releaseLua } from './lua'

const debug = createDebug('redis-semaphore:multi-semaphore:release')

export interface Options {
  identifier: string
  lockTimeout: number
  now: number
}

export async function releaseSemaphore(
  client: Redis.Redis | Redis.Cluster,
  key: string,
  permits: number,
  identifier: string
) {
  debug(key, identifier, permits)
  const result = await releaseLua(client, [key, permits, identifier])
  debug('result', typeof result, result)
}
