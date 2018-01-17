const debug = require('debug')('redis-semaphore:semaphore:refresh')
const createEval = require('../utils/createEval')

const refreshLua = createEval(
  'if redis.call("zscore", KEYS[1], ARGV[1]) then redis.call("zadd", KEYS[1], ARGV[2], ARGV[1]) return 1 end',
  1
)

async function refreshSemaphore(client, key, identifier) {
  const now = Date.now()
  debug(key, identifier, now)
  const result = await refreshLua(client, [key, identifier, now])
  debug('result', typeof result, result)
  return result === 1
}

module.exports = refreshSemaphore
