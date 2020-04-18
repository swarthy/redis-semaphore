import createDebug from 'debug'
import { Redis } from 'ioredis'

import LostLockError from './errors/LostLockError'
import { defaultTimeoutOptions, TimeoutOptions } from './misc'
import RedisMutex from './RedisMutex'
import { acquire, refresh, release } from './semaphore/index'

const debug = createDebug('redis-semaphore:semaphore:instance')

export default class RedisSemaphore extends RedisMutex {
  protected _limit: number
  constructor(
    client: Redis,
    key: string,
    limit: number,
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
    this._limit = +limit
  }

  protected async _processRefresh(identifier: string) {
    debug(`refresh semaphore (key: ${this._key}, identifier: ${identifier})`)
    const refreshed = await refresh(
      this._client,
      this._key,
      identifier,
      this._lockTimeout
    )
    if (!refreshed) {
      throw new LostLockError(`Lost semaphore for key ${this._key}`)
    }
  }

  async acquire() {
    debug(`acquire semaphore (key: ${this._key})`)
    this._identifier = await acquire(
      this._client,
      this._key,
      this._limit,
      this._lockTimeout,
      this._acquireTimeout,
      this._retryInterval
    )
    if (this._refreshTimeInterval > 0) {
      this._startRefresh(this._identifier)
    }
    return this._identifier
  }

  async release() {
    if (!this._identifier) {
      throw new Error(`semaphore ${this._key} has no identifier`)
    }
    debug(
      `release semaphore (key: ${this._key}, identifier: ${this._identifier})`
    )
    if (this._refreshTimeInterval > 0) {
      this._stopRefresh()
    }
    await release(this._client, this._key, this._identifier)
  }
}
