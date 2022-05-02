import createDebug from 'debug'
import Redis from 'ioredis'

const debug = createDebug('redis-semaphore:redlock-mutex:release')

export async function releaseRedlockSemaphore(
  clients: Redis[],
  key: string,
  identifier: string
) {
  debug(key, identifier)
  const promises = clients.map(client =>
    client.zrem(key, identifier).catch(() => 0)
  )
  const results = await Promise.all(promises)
  debug('results', results)
}
