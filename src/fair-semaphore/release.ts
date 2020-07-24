import createDebug from 'debug'
import Redis from 'ioredis'

import { createEval } from '../utils/index'

const debug = createDebug('redis-semaphore:fair-semaphore:release')
const releaseLua = createEval(
  `
  local key = KEYS[1]
  local keyOwner = KEYS[2]
  local identifier = ARGV[1]

  local removed = redis.call('zrem', key, identifier)
  redis.call('zrem', keyOwner, identifier)
  `,
  2
)

export default async function releaseFairSemaphore(
  client: Redis.Redis | Redis.Cluster,
  key: string,
  identifier: string
) {
  debug(key, identifier)
  const result = await releaseLua(client, [key, `${key}:owner`, identifier])
  debug('result', typeof result, result)
  return result === 1
}
