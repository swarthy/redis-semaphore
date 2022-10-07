import MultiSemaphore from './RedisMultiSemaphore'
import Mutex from './RedisMutex'
import Semaphore from './RedisSemaphore'
import RedlockMultiSemaphore from './RedlockMultiSemaphore'
import RedlockMutex from './RedlockMutex'
import RedlockSemaphore from './RedlockSemaphore'
import TimeoutError from './errors/TimeoutError'
import LostLockError from './errors/LostLockError'

export { defaultTimeoutOptions } from './misc'

export {
  Mutex,
  Semaphore,
  MultiSemaphore,
  RedlockMutex,
  RedlockSemaphore,
  RedlockMultiSemaphore,
  TimeoutError,
  LostLockError
}

export type { LockLostCallback, TimeoutOptions, LockOptions } from './types'
