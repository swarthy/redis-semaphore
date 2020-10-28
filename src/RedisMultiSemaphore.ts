import Redis from 'ioredis'

import { defaultTimeoutOptions, TimeoutOptions } from './misc'
import { acquireSemaphore } from './multiSemaphore/acquire/index'
import { refreshSemaphore } from './multiSemaphore/refresh/index'
import { releaseSemaphore } from './multiSemaphore/release/index'
import RedisMutex from './RedisMutex'

export default class RedisMultiSemaphore extends RedisMutex {
  protected _kind = 'multi-semaphore'
  protected _permits: number
  protected _limit: number

  constructor(
    client: Redis.Redis | Redis.Cluster,
    key: string,
    limit: number,
    permits: number,
    {
      lockTimeout = defaultTimeoutOptions.lockTimeout,
      acquireTimeout = defaultTimeoutOptions.acquireTimeout,
      retryInterval = defaultTimeoutOptions.retryInterval,
      refreshInterval
    }: TimeoutOptions = defaultTimeoutOptions
  ) {
    super(client, key, {
      lockTimeout,
      acquireTimeout,
      retryInterval,
      refreshInterval
    })
    if (!limit) {
      throw new Error('"limit" is required')
    }
    if (typeof limit !== 'number') {
      throw new Error('"limit" must be a number')
    }
    if (!permits) {
      throw new Error('"permits" is required')
    }
    if (typeof permits !== 'number') {
      throw new Error('"permits" must be a number')
    }
    this._key = `semaphore:${key}`
    this._limit = limit
    this._permits = permits
  }

  protected async _refresh() {
    return await refreshSemaphore(
      this._client,
      this._key,
      this._permits,
      this._identifier,
      this._acquireOptions.lockTimeout
    )
  }

  protected async _acquire() {
    return await acquireSemaphore(
      this._client,
      this._key,
      this._permits,
      this._limit,
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
