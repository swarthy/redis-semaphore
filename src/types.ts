import LostLockError from './errors/LostLockError'
import { Lock } from './Lock'

export interface LockLostCallback {
  (this: Lock, err: LostLockError): void
}

export interface TimeoutOptions {
  lockTimeout?: number
  acquireTimeout?: number
  acquireAttemptsLimit?: number
  retryInterval?: number
  refreshInterval?: number
}

export interface LockOptions extends TimeoutOptions {
  onLockLost?: LockLostCallback
}

export interface AcquireOptions {
  identifier: string
  lockTimeout: number
  acquireTimeout: number
  acquireAttemptsLimit: number
  retryInterval: number
}
