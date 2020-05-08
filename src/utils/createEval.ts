import { createHash } from 'crypto'
import createDebug from 'debug'
import { Redis } from 'ioredis'

const debug = createDebug('redis-semaphore:eval')

function createSHA1(script: string) {
  return createHash('sha1').update(script, 'utf8').digest('hex')
}

function isNoScriptError(err: Error) {
  return err.toString().indexOf('NOSCRIPT') !== -1
}

export default function createEval(script: string, keysCount: number) {
  const sha1 = createSHA1(script)
  const baseArgs = [script, keysCount]
  const baseSHAArgs = [sha1, keysCount]
  debug('creating script:', script, 'sha1:', sha1)
  return async function optimizedEval(
    client: Redis,
    args: Array<number | string>
  ) {
    const evalSHAArgs = baseSHAArgs.concat(args)
    debug(sha1, 'attempt, args:', evalSHAArgs)
    try {
      return await client.evalsha(sha1, keysCount, ...args)
    } catch (err) {
      if (isNoScriptError(err)) {
        const evalArgs = baseArgs.concat(args)
        debug(sha1, 'fallback to eval, args:', evalArgs)
        return await client.eval(evalArgs)
      } else {
        throw err
      }
    }
  }
}
