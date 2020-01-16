import createDebug from 'debug'

import LostLockError from './errors/LostLockError'
import { acquire, refresh, release } from './fair-semaphore/index'
import RedisSemaphore from './RedisSemaphore'

const debug = createDebug('redis-semaphore:fair-semaphore:instance')

export default class RedisFairSemaphore extends RedisSemaphore {
  protected async _refresh() {
    if (!this._identifier) {
      throw new Error(`fair-semaphore ${this._key} has no identifier`)
    }
    debug(
      `refresh fair-semaphore (key: ${this._key}, identifier: ${this._identifier})`
    )
    const refreshed = await refresh(this._client, this._key, this._identifier)
    if (!refreshed) {
      this._stopRefresh()
      throw new LostLockError(`Lost fairSemaphore for key ${this._key}`)
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
    this._startRefresh()
    return this._identifier
  }

  async release() {
    if (!this._identifier) {
      throw new Error(`fair-semaphore ${this._key} has no identifier`)
    }
    debug(
      `release fair-semaphore (key: ${this._key}, identifier: ${this._identifier})`
    )
    this._stopRefresh()
    const released = await release(this._client, this._key, this._identifier)
    return released
  }
}
