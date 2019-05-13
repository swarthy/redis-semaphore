const RedisSemaphore = require('./RedisSemaphore')
const debug = require('debug')('redis-semaphore:fair-semaphore:instance')
const LostLockError = require('./errors/LostLockError')
const fairSemaphore = require('./fair-semaphore')

class RedisFairSemaphore extends RedisSemaphore {
  async _refresh() {
    debug(
      `refresh fair-semaphore (key: ${this._key}, identifier: ${
        this._identifier
      })`
    )
    const refreshed = await fairSemaphore.refresh(
      this._client,
      this._key,
      this._identifier
    )
    if (!refreshed) {
      this._stopRefresh()
      throw new LostLockError(`Lost fairSemaphore for key ${this._key}`)
    }
  }

  async acquire() {
    debug(`acquire fair-semaphore (key: ${this._key})`)
    this._identifier = await fairSemaphore.acquire(
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
    debug(
      `release fair-semaphore (key: ${this._key}, identifier: ${
        this._identifier
      })`
    )
    this._stopRefresh()
    const released = await fairSemaphore.release(
      this._client,
      this._key,
      this._identifier
    )
    return released
  }
}

module.exports = RedisFairSemaphore
