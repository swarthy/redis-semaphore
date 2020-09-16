import createDebug from 'debug'
import Redis from 'ioredis'
import { v4 as uuid4 } from 'uuid'

import LostLockError from './errors/LostLockError'
import TimeoutError from './errors/TimeoutError'
import { defaultTimeoutOptions, TimeoutOptions } from './misc'
import { acquireMutex, Options as AcquireOptions } from './mutex/acquire'
import { refreshMutex } from './mutex/refresh'
import { releaseMutex } from './mutex/release'

const debug = createDebug('redis-semaphore:instance')
const REFRESH_INTERVAL_COEF = 0.8

export default class RedisMutex {
  protected _kind = 'mutex'
  protected _client: Redis.Redis | Redis.Cluster
  protected _key: string
  protected _identifier: string
  protected _acquireOptions: AcquireOptions
  protected _refreshTimeInterval: number
  protected _refreshInterval?: ReturnType<typeof setInterval>
  constructor(
    client: Redis.Redis | Redis.Cluster,
    key: string,
    {
      lockTimeout = defaultTimeoutOptions.lockTimeout,
      acquireTimeout = defaultTimeoutOptions.acquireTimeout,
      retryInterval = defaultTimeoutOptions.retryInterval,
      refreshInterval = Math.round(lockTimeout * REFRESH_INTERVAL_COEF)
    }: TimeoutOptions = defaultTimeoutOptions
  ) {
    if (!client) {
      throw new Error('"client" is required')
    }
    if (!(client instanceof Redis || client instanceof Redis.Cluster)) {
      throw new Error('"client" must be instance of ioredis client or cluster')
    }
    if (!key) {
      throw new Error('"key" is required')
    }
    if (typeof key !== 'string') {
      throw new Error('"key" must be a string')
    }
    this._client = client
    this._key = `mutex:${key}`
    this._identifier = uuid4()
    this._acquireOptions = {
      lockTimeout,
      acquireTimeout,
      retryInterval,
      identifier: this._identifier
    }
    this._refreshTimeInterval = refreshInterval
    this._processRefresh = this._processRefresh.bind(this)
  }

  private _startRefresh() {
    this._refreshInterval = setInterval(
      this._processRefresh,
      this._refreshTimeInterval
    )
    this._refreshInterval.unref()
  }

  private _stopRefresh() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval)
    }
  }

  private async _processRefresh() {
    try {
      debug(
        `refresh ${this._kind} (key: ${this._key}, identifier: ${this._identifier})`
      )
      const refreshed = await this._refresh()
      if (!refreshed) {
        throw new LostLockError(`Lost ${this._kind} for key ${this._key}`)
      }
    } catch (err) {
      this._stopRefresh()
      throw err
    }
  }

  protected async _refresh() {
    return await refreshMutex(
      this._client,
      this._key,
      this._identifier,
      this._acquireOptions.lockTimeout
    )
  }

  protected async _acquire() {
    return await acquireMutex(this._client, this._key, this._acquireOptions)
  }

  protected async _release() {
    await releaseMutex(this._client, this._key, this._identifier)
  }

  get identifier() {
    return this._identifier
  }

  async acquire() {
    debug(`acquire ${this._kind} (key: ${this._key})`)
    const acquired = await this._acquire()
    if (!acquired) {
      throw new TimeoutError(`Acquire ${this._kind} ${this._key} timeout`)
    }
    if (this._refreshTimeInterval > 0) {
      this._startRefresh()
    }
  }

  async release() {
    debug(
      `release ${this._kind} (key: ${this._key}, identifier: ${this._identifier})`
    )
    if (this._refreshTimeInterval > 0) {
      this._stopRefresh()
    }
    await this._release()
  }
}
