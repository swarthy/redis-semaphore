import Redis from 'ioredis'

import { TimeoutOptions } from './misc'
import { acquireSemaphore } from './multiSemaphore/acquire/index'
import { refreshSemaphore } from './multiSemaphore/refresh/index'
import { releaseSemaphore } from './multiSemaphore/release/index'
import RedisSemaphore from './RedisSemaphore'

export default class RedisMultiSemaphore extends RedisSemaphore {
  protected _kind = 'multi-semaphore'
  protected _permits: number

  constructor(
    client: Redis.Redis,
    key: string,
    limit: number,
    permits: number,
    options?: TimeoutOptions
  ) {
    super(client, key, limit, options)
    if (!permits) {
      throw new Error('"permits" is required')
    }
    if (typeof permits !== 'number') {
      throw new Error('"permits" must be a number')
    }
    this._permits = permits
  }

  protected async _refresh() {
    return await refreshSemaphore(
      this._client,
      this._key,
      this._limit,
      this._permits,
      this._acquireOptions
    )
  }

  protected async _acquire() {
    return await acquireSemaphore(
      this._client,
      this._key,
      this._limit,
      this._permits,
      this._acquireOptions
    )
  }

  protected async _release() {
    await releaseSemaphore(
      this._client,
      this._key,
      this._permits,
      this._identifier
    )
  }
}