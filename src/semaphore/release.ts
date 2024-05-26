import createDebug from 'debug'
import { RedisClient } from '../types'

const debug = createDebug('redis-semaphore:semaphore:release')

export async function releaseSemaphore(
  client: RedisClient,
  key: string,
  identifier: string
) {
  debug(key, identifier)
  const result = await client.zrem(key, identifier)
  debug('result', typeof result, result)
}
