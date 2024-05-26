### redis-semaphore@5.6.0
- Added interface compatible client support (ex. `ioredis-mock`)
- Removed `instanceof Redis` validation in constructor
- `ioredis` marked as optional peerDependency, explicit `ioredis` install is required now

### redis-semaphore@5.5.1
- Fix race condition for refresh started before release and finished after release

### redis-semaphore@5.5.0

- Added `identifier` constructor option.
- Added `acquiredExternally` constructor option.
- Option `externallyAcquiredIdentifier` **DEPRECATED**.
- Option `identifierSuffix` **DEPRECATED**.

### redis-semaphore@5.4.0

- Added `identifierSuffix` option, usefull for tracing app instance which locked resource

### redis-semaphore@5.3.1

- Fixed reacquire expired resource in refresh

### redis-semaphore@5.3.0

- Added `stopRefresh` method
- Added `externallyAcquiredIdentifier` optional constructor option
- Removed `uuid` dependency

### redis-semaphore@5.2.0

- Added `acquireAttemptsLimit` method

### redis-semaphore@5.1.0

- Added `tryAcquire`

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
  - the `acquire` method in `Semaphore` no longer returns a boolean. Instead, it throws an error if it cannot acquire, and if it doesn't throw, you can assume it worked.
- Internal code has been cleaned up
- Added more test, include synthetic node unsynchroned clocks
