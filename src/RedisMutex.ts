import Redis from 'ioredis'

import { Lock } from './Lock'
import { acquireMutex } from './mutex/acquire'
import { refreshMutex } from './mutex/refresh'
import { releaseMutex } from './mutex/release'
import { LockOptions } from './types'

export default class RedisMutex extends Lock {
  protected _kind = 'mutex'
  protected _key: string
  protected _client: Redis

  constructor(client: Redis, key: string, options?: LockOptions) {
    super(options)
    if (!client) {
      throw new Error('"client" is required')
    }
    if (!(client instanceof Redis)) {
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
  }

  protected async _refresh() {
    return await refreshMutex(
      this._client,
      this._key,
      this._identifier,
      this._acquireOptions.lockTimeout
    )
  }

  protected async _update(newTimeout: number) {
    return await refreshMutex(
      this._client,
      this._key,
      this._identifier,
      newTimeout
    )
  }

  protected async _acquire() {
    return await acquireMutex(this._client, this._key, this._acquireOptions)
  }

  protected async _release() {
    await releaseMutex(this._client, this._key, this._identifier)
  }
}
