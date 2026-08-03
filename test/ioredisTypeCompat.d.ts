import type { ClientContext, RedisKey, Result } from 'ioredis'

/**
 * ioredis 6 types `zrange` as `(key, start: string | Buffer | number, stop: string | Buffer)`,
 * dropping `number` from `stop` (ioredis 5 accepted it on both). That rejects the most common
 * call there is: `zrange(key, 0, -1)`.
 *
 * Add back the overloads that accept a numeric `stop`. Test-only, the published types are
 * untouched. Remove once ioredis fixes the generated command interface.
 */
declare module 'ioredis' {
  interface RedisCommander<Context extends ClientContext> {
    zrange(
      key: RedisKey,
      start: string | Buffer | number,
      stop: number,
      callback?: (err: Error | null, res: string[]) => void
    ): Result<string[], Context>
    zrange(
      key: RedisKey,
      start: string | Buffer | number,
      stop: number,
      withscores: 'WITHSCORES',
      callback?: (err: Error | null, res: string[]) => void
    ): Result<string[], Context>
  }
}
