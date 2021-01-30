import Redis from 'ioredis'

import RedisMutex from './RedisMutex'
import { acquireSemaphore } from './semaphore/acquire/index'
import { refreshSemaphore } from './semaphore/refresh/index'
import { releaseSemaphore } from './semaphore/release'
import { LockOptions } from './types'

export default class RedisSemaphore extends RedisMutex {
  protected _kind = 'semaphore'
  protected _limit: number

  constructor(
    client: Redis.Redis,
    key: string,
    limit: number,
    options?: LockOptions
  ) {
    super(client, key, options)
    if (!limit) {
      throw new Error('"limit" is required')
    }
    if (typeof limit !== 'number') {
      throw new Error('"limit" must be a number')
    }
    this._key = `semaphore:${key}`
    this._limit = limit
  }

  protected async _refresh() {
    return await refreshSemaphore(
      this._client,
      this._key,
      this._limit,
      this._acquireOptions
    )
  }

  protected async _acquire() {
    return await acquireSemaphore(
      this._client,
      this._key,
      this._limit,
      this._acquireOptions
    )
  }

  protected async _release() {
    await releaseSemaphore(this._client, this._key, this._identifier)
  }
}
