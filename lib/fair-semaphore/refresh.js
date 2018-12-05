const debug = require('debug')('redis-semaphore:fair-semaphore:refresh')
const createEval = require('../utils/createEval')

const refreshLua = createEval(
  `
  local result = redis.call("zadd", KEYS[1], ARGV[2], ARGV[1])
  if  result == 1 then
    redis.call('zrem', KEYS[1], ARGV[1])
    redis.call('zrem', KEYS[2], ARGV[1])
    return 0
  end
  return 1
  `,
  2
)

async function refreshFairSemaphore(client, key, identifier) {
  const now = Date.now()
  debug(key, identifier, now)
  const result = await refreshLua(client, [
    key,
    `${key}:owner`,
    identifier,
    now
  ])
  debug('result', typeof result, result)
  return result === 1
}

module.exports = refreshFairSemaphore
