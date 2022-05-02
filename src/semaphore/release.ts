import createDebug from 'debug'
import Redis from 'ioredis'

const debug = createDebug('redis-semaphore:semaphore:release')

export async function releaseSemaphore(
  client: Redis,
  key: string,
  identifier: string
) {
  debug(key, identifier)
  const result = await client.zrem(key, identifier)
  debug('result', typeof result, result)
}
