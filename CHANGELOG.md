### redis-semaphore@5.0.0

- **Breadking change:** Drop Node.js v10.x, v12.x support
- Added `ioredis@5` support

### redis-semaphore@4.1.0

- Added `.isAcquired` property on all locks
- Added `onLostLock` constructor option. By default throws unhandled error.

### redis-semaphore@4.0.0

- **Breaking change:** `Mutex`, `Semaphore`, `MultiSemaphore` not longer support `Cluster`. For multi-node case use `Redlock*` instead.
- Added `RedlockMutex`, `RedlockSemaphore`, `RedlockMultiSemaphore`
- Internals refactored

### redis-semaphore@3.2.0

- Added `MultiSemaphore`

### redis-semaphore@3.0.0

- **Breaking change:** `FairSemaphore` has been removed. Use `Semaphore` instead (has the same "fairness")
- Internal code has been cleaned up
- Added more test, include synthetic node unsynchroned clocks
