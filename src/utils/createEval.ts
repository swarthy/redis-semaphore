import { createHash } from 'crypto'
import createDebug from 'debug'
import { RedisClient } from '../types.js'
import { getConnectionName } from './index.js'

const debug = createDebug('redis-semaphore:eval')

function createSHA1(script: string): string {
  return createHash('sha1').update(script, 'utf8').digest('hex')
}

function isNoScriptError(err: Error): boolean {
  return err.toString().indexOf('NOSCRIPT') !== -1
}

export default function createEval<Args extends Array<number | string>, Result>(
  script: string,
  keysCount: number
): (client: RedisClient, args: Args) => Promise<Result> {
  const sha1 = createSHA1(script)
  debug('creating script:', script, 'sha1:', sha1)
  return async function optimizedEval(
    client: RedisClient,
    args: Args
  ): Promise<Result> {
    const connectionName = getConnectionName(client)
    const evalSHAArgs = [sha1, keysCount, ...args]
    debug(connectionName, sha1, 'attempt, args:', evalSHAArgs)
    try {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Result is caller-supplied and unrelated to the untyped eval return
      return (await client.evalsha(sha1, keysCount, ...args)) as Result
    } catch (err) {
      if (err instanceof Error && isNoScriptError(err)) {
        const evalArgs = [script, keysCount, ...args]
        debug(connectionName, sha1, 'fallback to eval, args:', evalArgs)
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Result is caller-supplied and unrelated to the untyped eval return
        return (await client.eval(
          script,
          keysCount,
          ...args
        )) as Result
      } else {
        throw err
      }
    }
  }
}
