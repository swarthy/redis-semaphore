import { Lock } from './Lock'
import { defaultTimeoutOptions } from './misc'
import { acquireRedlockMutex } from './redlockMutex/acquire'
import { refreshRedlockMutex } from './redlockMutex/refresh'
import { releaseRedlockMutex } from './redlockMutex/release'
import { LockOptions, RedisClient } from './types'

export default class RedlockMutex extends Lock {
  protected _kind = 'redlock-mutex'
  protected _key: string
  protected _clients: RedisClient[]

  constructor(
    clients: RedisClient[],
    key: string,
    options: LockOptions = defaultTimeoutOptions
  ) {
    super(options)
    if (!clients || !Array.isArray(clients)) {
      throw new Error('"clients" array is required')
    }
    if (!key) {
      throw new Error('"key" is required')
    }
    if (typeof key !== 'string') {
      throw new Error('"key" must be a string')
    }
    this._clients = clients
    this._key = `mutex:${key}`
  }

  protected async _refresh(): Promise<boolean> {
    return await refreshRedlockMutex(
      this._clients,
      this._key,
      this._identifier,
      this._acquireOptions.lockTimeout
    )
  }

  protected async _acquire(abortSignal?: AbortSignal): Promise<boolean> {
    return await acquireRedlockMutex(
      this._clients,
      this._key,
      this._acquireOptions,
      abortSignal
    )
  }

  protected async _release(): Promise<void> {
    await releaseRedlockMutex(this._clients, this._key, this._identifier)
  }
}
