const debug = require('debug')('redis-semaphore:mutex:refresh')
const createEval = require('../utils/createEval')

const expireIfEqualLua = createEval(
  'if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("pexpire",KEYS[1],ARGV[2]) end',
  1
)

async function refreshMutex(client, key, identifier, lockTimeout = 10000) {
  debug(key, identifier)
  const result = await expireIfEqualLua(client, [key, identifier, lockTimeout])
  debug('result', typeof result, result)
  return result === 1
}

module.exports = refreshMutex
