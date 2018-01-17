const debug = require('debug')('redis-semaphore:mutex:release')
const createEval = require('../utils/createEval')

const delIfEqualLua = createEval(
  'if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) end',
  1
)

async function releaseMutex(client, key, identifier) {
  debug(key, identifier)
  const result = await delIfEqualLua(client, [key, identifier])
  debug('result', typeof result, result)
  return result === 1
}

module.exports = releaseMutex
