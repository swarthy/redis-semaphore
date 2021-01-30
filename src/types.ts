import LostLockError from './errors/LostLockError'
import { Lock } from './Lock'

export interface LockLostCallback {
  (this: Lock, err: LostLockError): void
}

export interface TimeoutOptions {
  lockTimeout?: number
  acquireTimeout?: number
  retryInterval?: number
  refreshInterval?: number
}

export interface LockOptions extends TimeoutOptions {
  onLockLost?: LockLostCallback
}
