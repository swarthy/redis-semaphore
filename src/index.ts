import MultiSemaphore from './RedisMultiSemaphore.js'
import Mutex from './RedisMutex.js'
import Semaphore from './RedisSemaphore.js'
import RedlockMultiSemaphore from './RedlockMultiSemaphore.js'
import RedlockMutex from './RedlockMutex.js'
import RedlockSemaphore from './RedlockSemaphore.js'
import LostLockError from './errors/LostLockError.js'
import TimeoutError from './errors/TimeoutError.js'

export { defaultTimeoutOptions } from './misc.js'

export {
  Mutex,
  Semaphore,
  MultiSemaphore,
  RedlockMutex,
  RedlockSemaphore,
  RedlockMultiSemaphore,
  LostLockError,
  TimeoutError
}

export type { LockLostCallback, TimeoutOptions, LockOptions } from './types.js'
