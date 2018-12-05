const RedisMutex = require('./RedisMutex')
const debug = require('debug')('redis-semaphore:fair-semaphore:instance')
const LostLockError = require('./errors/LostLockError')
const fairSemaphore = require('./fair-semaphore')

class RedisFairSemaphore extends RedisMutex {
  constructor(
    client,
    key,
    limit,
    {
      lockTimeout = 10000,
      acquireTimeout = 10000,
      retryInterval = 10,
      refreshInterval
    } = {}
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
    this._limit = parseInt(limit, 10)
  }
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
