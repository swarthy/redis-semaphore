const RedisMutex = require('./Mutex')
const debug = require('debug')('redis-semaphore:semaphore:instance')
const LostLockError = require('./errors/LostLockError')
const semaphore = require('./semaphore')

const DEFAULT_TIMEOUTS = {
  lockTimeout: 10000,
  acquireTimeout: 10000,
  retryInterval: 10
}

class RedisSemaphore extends RedisMutex {
  constructor(
    client,
    key,
    limit,
    {
      lockTimeout,
      acquireTimeout,
      retryInterval,
      refreshInterval
    } = DEFAULT_TIMEOUTS
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
      `refresh semaphore (key: ${this._key}, identifier: ${this._identifier})`
    )
    const refreshed = await semaphore.refresh(
      this._client,
      this._key,
      this._identifier
    )
    if (!refreshed) {
      throw new LostLockError(`Lost semaphore for key ${this._key}`)
    }
  }

  async acquire() {
    debug(`acquire semaphore (key: ${this._key})`)
    this._identifier = await semaphore.acquire(
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
      `release semaphore (key: ${this._key}, identifier: ${this._identifier})`
    )
    const released = await semaphore.release(
      this._client,
      this._key,
      this._identifier
    )
    this._stopRefresh()
    return released
  }
}

module.exports = RedisSemaphore
