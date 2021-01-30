import Redis from 'ioredis'

import { acquireRedlockMultiSemaphore } from './redlockMultiSemaphore/acquire'
import { refreshRedlockMultiSemaphore } from './redlockMultiSemaphore/refresh'
import { releaseRedlockMultiSemaphore } from './redlockMultiSemaphore/release'
import RedlockSemaphore from './RedlockSemaphore'
import { LockOptions } from './types'

export default class RedlockMultiSemaphore extends RedlockSemaphore {
  protected _kind = 'redlock-multi-semaphore'
  protected _permits: number

  constructor(
    clients: Redis.Redis[],
    key: string,
    limit: number,
    permits: number,
    options?: LockOptions
  ) {
    super(clients, key, limit, options)
    if (!permits) {
      throw new Error('"permits" is required')
    }
    if (typeof permits !== 'number') {
      throw new Error('"permits" must be a number')
    }
    this._permits = permits
  }

  protected async _refresh() {
    return await refreshRedlockMultiSemaphore(
      this._clients,
      this._key,
      this._limit,
      this._permits,
      this._acquireOptions
    )
  }

  protected async _acquire() {
    return await acquireRedlockMultiSemaphore(
      this._clients,
      this._key,
      this._limit,
      this._permits,
      this._acquireOptions
    )
  }

  protected async _release() {
    await releaseRedlockMultiSemaphore(
      this._clients,
      this._key,
      this._permits,
      this._identifier
    )
  }
}
