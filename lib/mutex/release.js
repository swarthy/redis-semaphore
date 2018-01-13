const debug = require('debug')('redis-semaphore:mutex:release')

const createEval = require('../utils/createEval')
const delIfEqual = createEval(
  'if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end',
  1
)

async function releaseLock(client, key, identifier) {
  debug(key, identifier)
  const result = await delIfEqual(client, [key, identifier])
  debug('result', result)
  return result === 1
}

module.exports = releaseLock
