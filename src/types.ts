import LostLockError from './errors/LostLockError'
import { Lock } from './Lock'

import type * as ioredis from 'ioredis'

/**
 * ioredis-like Redis client
 */
export type RedisClient = Pick<
  ioredis.Redis,
  'eval' | 'evalsha' | 'get' | 'set' | 'zrem'
>

export interface LockLostCallback {
  (this: Lock, err: LostLockError): void
}

export interface TimeoutOptions {
  lockTimeout?: number
  acquireTimeout?: number
  acquireAttemptsLimit?: number
  retryInterval?: number
  refreshInterval?: number
}

export interface LockOptions extends TimeoutOptions {
  /**
   * @deprecated Use `identifier` + `acquiredExternally: true` instead. Will be removed in next major release.
   */
  externallyAcquiredIdentifier?: string

  /**
   * @deprecated Provide custom `identifier` instead. Will be removed in next major release.
   */
  identifierSuffix?: string

  /**
   * Identifier of lock. By default is `crypto.randomUUID()`.
   *
   * Must be unique between parallel executors otherwise locks with same identifier *can* be treated as the same lock holder.
   *
   * Override only if you know what you are doing, see `acquireExternally` option.
   */
  identifier?: string

  /**
   * If `identifier` provided and `acquiredExternally` is `true` then `_refresh` will be used instead of `_acquire` in `.tryAcquire()`/`.acquire()`.
   *
   * Useful for lock sharing between processes: acquire in scheduler, refresh and release in handler.
   */
  acquiredExternally?: true

  onLockLost?: LockLostCallback
}

export interface AcquireOptions {
  identifier: string
  lockTimeout: number
  acquireTimeout: number
  acquireAttemptsLimit: number
  retryInterval: number
}
