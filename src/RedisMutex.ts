import createDebug from 'debug'
import Redis from 'ioredis'

import LostLockError from './errors/LostLockError'
import { TimeoutOptions } from './misc'
import { acquire, refresh, release } from './mutex/index'

const debug = createDebug('redis-semaphore:mutex:instance')
const REFRESH_INTERVAL_COEF = 0.8

const defaultTimeoutOptions = {
  lockTimeout: 10000,
  acquireTimeout: 10000,
  retryInterval: 10
}

export default class RedisMutex {
  protected _client: Redis.Redis
  protected _key: string
  protected _identifier?: string
  protected _lockTimeout: number
  protected _acquireTimeout: number
  protected _retryInterval: number
  protected _refreshTimeInterval: number
  protected _refreshInterval?: NodeJS.Timeout
  constructor(
    client: Redis.Redis,
    key: string,
    {
      lockTimeout = defaultTimeoutOptions.lockTimeout,
      acquireTimeout = defaultTimeoutOptions.acquireTimeout,
      retryInterval = defaultTimeoutOptions.retryInterval,
      refreshInterval
    }: TimeoutOptions = defaultTimeoutOptions
  ) {
    if (!client) {
      throw new Error('"client" is required')
    }
    if (!(client instanceof Redis)) {
      throw new Error('"client" must be instance of ioredis client')
    }
    if (!key) {
      throw new Error('"key" is required')
    }
    if (typeof key !== 'string') {
      throw new Error('"key" must be a string')
    }
    this._client = client
    this._key = key
    this._lockTimeout = lockTimeout
    this._acquireTimeout = acquireTimeout
    this._retryInterval = retryInterval
    this._refreshTimeInterval =
      refreshInterval || Math.round(lockTimeout * REFRESH_INTERVAL_COEF)
    this._refresh = this._refresh.bind(this)
  }
  protected _startRefresh() {
    this._refreshInterval = setInterval(
      this._refresh,
      this._refreshTimeInterval
    )
    this._refreshInterval.unref()
  }
  protected _stopRefresh() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval)
    }
  }
  protected async _refresh() {
    if (!this._identifier) {
      throw new Error(`mutex ${this._key} has no identifier`)
    }
    debug(`refresh mutex (key: ${this._key}, identifier: ${this._identifier})`)
    const refreshed = await refresh(
      this._client,
      this._key,
      this._identifier,
      this._lockTimeout
    )
    if (!refreshed) {
      this._stopRefresh()
      throw new LostLockError(`Lost mutex for key ${this._key}`)
    }
  }

  async acquire() {
    debug(`acquire mutex (key: ${this._key})`)
    this._identifier = await acquire(
      this._client,
      this._key,
      this._lockTimeout,
      this._acquireTimeout,
      this._retryInterval
    )
    this._startRefresh()
    return this._identifier
  }

  async release() {
    if (!this._identifier) {
      throw new Error(`mutex ${this._key} has no identifier`)
    }
    debug(`release mutex (key: ${this._key}, identifier: ${this._identifier})`)
    this._stopRefresh()
    const released = await release(this._client, this._key, this._identifier)
    return released
  }
}
