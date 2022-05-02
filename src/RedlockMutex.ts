import Redis from 'ioredis'

import { Lock } from './Lock'
import { defaultTimeoutOptions } from './misc'
import { acquireRedlockMutex } from './redlockMutex/acquire'
import { refreshRedlockMutex } from './redlockMutex/refresh'
import { releaseRedlockMutex } from './redlockMutex/release'
import { LockOptions } from './types'

export default class RedlockMutex extends Lock {
  protected _kind = 'redlock-mutex'
  protected _key: string
  protected _clients: Redis[]

  constructor(
    clients: Redis[],
    key: string,
    options: LockOptions = defaultTimeoutOptions
  ) {
    super(options)
    if (!clients || !Array.isArray(clients)) {
      throw new Error('"clients" array is required')
    }
    if (!clients.every(client => client instanceof Redis)) {
      throw new Error('"client" must be instance of ioredis client')
    }
    if (!key) {
      throw new Error('"key" is required')
    }
    if (typeof key !== 'string') {
      throw new Error('"key" must be a string')
    }
    this._clients = clients
    this._key = `mutex:${key}`
  }

  protected async _refresh() {
    return await refreshRedlockMutex(
      this._clients,
      this._key,
      this._identifier,
      this._acquireOptions.lockTimeout
    )
  }

  protected async _acquire() {
    return await acquireRedlockMutex(
      this._clients,
      this._key,
      this._acquireOptions
    )
  }

  protected async _release() {
    await releaseRedlockMutex(this._clients, this._key, this._identifier)
  }
}
