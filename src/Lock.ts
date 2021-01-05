import createDebug from 'debug'
import { v4 as uuid4 } from 'uuid'

import LostLockError from './errors/LostLockError'
import TimeoutError from './errors/TimeoutError'
import { defaultTimeoutOptions, TimeoutOptions } from './misc'

const REFRESH_INTERVAL_COEF = 0.8

const debug = createDebug('redis-semaphore:instance')

interface AcquireOptions {
  identifier: string
  lockTimeout: number
  acquireTimeout: number
  retryInterval: number
}

export abstract class Lock {
  protected abstract _kind: string
  protected abstract _key: string
  protected _identifier: string
  protected _acquireOptions: AcquireOptions
  protected _refreshTimeInterval: number
  protected _refreshInterval?: ReturnType<typeof setInterval>
  protected _refreshing = false

  protected abstract _refresh(): Promise<boolean>
  protected abstract _acquire(): Promise<boolean>
  protected abstract _release(): Promise<void>

  constructor({
    lockTimeout = defaultTimeoutOptions.lockTimeout,
    acquireTimeout = defaultTimeoutOptions.acquireTimeout,
    retryInterval = defaultTimeoutOptions.retryInterval,
    refreshInterval = Math.round(lockTimeout * REFRESH_INTERVAL_COEF)
  }: TimeoutOptions = defaultTimeoutOptions) {
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

  get identifier() {
    return this._identifier
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
      debug(
        `clear refresh interval ${this._kind} (key: ${this._key}, identifier: ${this._identifier})`
      )
      clearInterval(this._refreshInterval)
    }
  }

  private async _processRefresh() {
    if (this._refreshing) {
      debug(
        `already refreshing ${this._kind} (key: ${this._key}, identifier: ${this._identifier}) (skip)`
      )
      return
    }
    this._refreshing = true
    try {
      debug(
        `refresh ${this._kind} (key: ${this._key}, identifier: ${this._identifier})`
      )
      const refreshed = await this._refresh()
      if (!refreshed) {
        this._stopRefresh()
        throw new LostLockError(`Lost ${this._kind} for key ${this._key}`)
      }
    } finally {
      this._refreshing = false
    }
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
