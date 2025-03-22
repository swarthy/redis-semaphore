import createDebug from 'debug'
import * as crypto from 'node:crypto'
import LostLockError from './errors/LostLockError'
import TimeoutError from './errors/TimeoutError'
import { defaultOnLockLost, defaultTimeoutOptions } from './misc'
import { AcquireOptions, LockLostCallback, LockOptions } from './types'

const REFRESH_INTERVAL_COEF = 0.8

const debug = createDebug('redis-semaphore:instance')

export abstract class Lock {
  protected abstract _kind: string
  protected abstract _key: string
  protected _identifier: string
  protected _acquireOptions: AcquireOptions
  protected _refreshTimeInterval: number
  protected _refreshInterval?: ReturnType<typeof setInterval>
  protected _refreshing = false
  protected _acquired = false
  protected _acquiredExternally = false
  protected _onLockLost: LockLostCallback

  protected abstract _refresh(): Promise<boolean>
  protected abstract _acquire(): Promise<boolean>
  protected abstract _release(): Promise<void>

  constructor({
    lockTimeout = defaultTimeoutOptions.lockTimeout,
    acquireTimeout = defaultTimeoutOptions.acquireTimeout,
    acquireAttemptsLimit = defaultTimeoutOptions.acquireAttemptsLimit,
    retryInterval = defaultTimeoutOptions.retryInterval,
    refreshInterval = Math.round(lockTimeout * REFRESH_INTERVAL_COEF),
    onLockLost = defaultOnLockLost,
    externallyAcquiredIdentifier,
    identifierSuffix,
    identifier,
    acquiredExternally
  }: LockOptions = defaultTimeoutOptions) {
    if (
      identifier !== undefined &&
      (!identifier || typeof identifier !== 'string')
    ) {
      throw new Error('identifier must be not empty random string')
    }
    if (acquiredExternally && !identifier) {
      throw new Error(
        'acquiredExternally=true meanless without custom identifier'
      )
    }
    if (externallyAcquiredIdentifier && (identifier || acquiredExternally)) {
      throw new Error(
        'Invalid usage. Use custom identifier and acquiredExternally: true'
      )
    }
    this._identifier =
      identifier ||
      externallyAcquiredIdentifier ||
      this.getIdentifier(identifierSuffix)
    this._acquiredExternally =
      !!acquiredExternally || !!externallyAcquiredIdentifier
    this._acquireOptions = {
      lockTimeout,
      acquireTimeout,
      acquireAttemptsLimit,
      retryInterval,
      identifier: this._identifier
    }
    this._refreshTimeInterval = refreshInterval
    this._onLockLost = onLockLost
  }

  get identifier(): string {
    return this._identifier
  }

  get isAcquired(): boolean {
    return this._acquired
  }

  private getIdentifier(identifierSuffix: string | undefined): string {
    const uuid = crypto.randomUUID()
    return identifierSuffix ? `${uuid}-${identifierSuffix}` : uuid
  }

  private _startRefresh(): void {
    this._refreshInterval = setInterval(
      this._processRefresh,
      this._refreshTimeInterval
    )
    this._refreshInterval.unref()
  }

  stopRefresh(): void {
    if (this._refreshInterval) {
      debug(
        `clear refresh interval ${this._kind} (key: ${this._key}, identifier: ${this._identifier})`
      )
      clearInterval(this._refreshInterval)
    }
  }

  private _processRefresh = async (): Promise<void> => {
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
        if (!this._acquired) {
          debug(
            `refresh ${this._kind} (key: ${this._key}, identifier: ${this._identifier} failed, but lock was purposefully released`
          )
          return
        }
        this._acquired = false
        this.stopRefresh()
        const lockLostError = new LostLockError(
          `Lost ${this._kind} for key ${this._key}`
        )
        this._onLockLost(lockLostError)
      }
    } finally {
      this._refreshing = false
    }
  }

  async acquire(): Promise<void> {
    debug(`acquire ${this._kind} (key: ${this._key})`)
    const acquired = await this.tryAcquire()
    if (!acquired) {
      throw new TimeoutError(`Acquire ${this._kind} ${this._key} timeout`)
    }
  }

  async tryAcquire(): Promise<boolean> {
    debug(`tryAcquire ${this._kind} (key: ${this._key})`)
    const acquired = this._acquiredExternally
      ? await this._refresh()
      : await this._acquire()
    if (!acquired) {
      return false
    }
    this._acquired = true
    this._acquiredExternally = false
    if (this._refreshTimeInterval > 0) {
      this._startRefresh()
    }
    return true
  }

  async release(): Promise<void> {
    debug(
      `release ${this._kind} (key: ${this._key}, identifier: ${this._identifier})`
    )
    if (this._refreshTimeInterval > 0) {
      this.stopRefresh()
    }
    if (this._acquired || this._acquiredExternally) {
      await this._release()
    }
    this._acquired = false
    this._acquiredExternally = false
  }
}
