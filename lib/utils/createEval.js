const debug = require('debug')('redis-semaphore:eval')
const crypto = require('crypto')

function createSHA1(script) {
  return crypto
    .createHash('sha1')
    .update(script, 'utf8')
    .digest('hex')
}

function isNoScriptError(err) {
  return (err.command === 'EVALSHA' && err.code === 'NOSCRIPT') || // redis
     (err.command.name === 'evalsha' && err.message.startsWith('NOSCRIPT')) // ioredis
}

function createEval(script, keysCount = 0) {
  const sha1 = createSHA1(script)
  const baseArgs = [script, keysCount]
  const baseSHAArgs = [sha1, keysCount]
  debug('creating script:', script, 'sha1:', sha1)
  return async function optimizedEval(client, args) {
    const evalSHAArgs = baseSHAArgs.concat(args || [])
    debug(sha1, 'attempt, args:', evalSHAArgs)
    try {
      return await client.evalsha(evalSHAArgs)
    } catch (err) {
      if (isNoScriptError(err)) {
        const evalArgs = baseArgs.concat(args || [])
        debug(sha1, 'fallback to eval, args:', evalArgs)
        return await client.eval(evalArgs)
      } else {
        throw err
      }
    }
  }
}

module.exports = createEval

