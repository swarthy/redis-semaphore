import createDebug from 'debug'

import LostLockError from './errors/LostLockError'
import { acquire, refresh, release } from './fair-semaphore/index'
import RedisSemaphore from './RedisSemaphore'

const debug = createDebug('redis-semaphore:fair-semaphore:instance')

export default class RedisFairSemaphore extends RedisSemaphore {
  protected async _processRefresh(identifier: string) {
    debug(
      `refresh fair-semaphore (key: ${this._key}, identifier: ${identifier})`
    )
    try {
      const refreshed = await refresh(
        this._client,
        this._key,
        identifier,
        this._lockTimeout
      )
      if (!refreshed) {
        throw new LostLockError(`Lost fairSemaphore for key ${this._key}`)
      }
    } catch (err) {
      this._stopRefresh()
      throw err
    }
  }

  async acquire() {
    debug(`acquire fair-semaphore (key: ${this._key})`)
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
      throw new Error(`fair-semaphore ${this._key} has no identifier`)
    }
    debug(
      `release fair-semaphore (key: ${this._key}, identifier: ${this._identifier})`
    )
    if (this._refreshTimeInterval > 0) {
      this._stopRefresh()
    }
    await release(this._client, this._key, this._identifier)
  }
}
