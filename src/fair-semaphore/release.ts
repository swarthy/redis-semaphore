import createDebug from 'debug'
import { Redis } from 'ioredis'

import { createEval } from '../utils/index'

const debug = createDebug('redis-semaphore:fair-semaphore:release')
const releaseLua = createEval(
  `
  local removed = redis.call('zrem', KEYS[1], ARGV[1])
  redis.call('zrem', KEYS[2], ARGV[1])
  return removed
  `,
  2
)

export default async function releaseFairSemaphore(
  client: Redis,
  key: string,
  identifier: string
) {
  debug(key, identifier)
  const result = await releaseLua(client, [key, `${key}:owner`, identifier])
  debug('result', typeof result, result)
  return result === 1
}
