### redis-semaphore@6.0.0

- **Breaking change:** Minimum supported Node.js version raised to `>= 22.12.0`
- **Breaking change:** `lib/` now ships pure ESM instead of CommonJS (`"type": "module"`). `main`/`exports` still point at `lib/index.js`, so plain `require('redis-semaphore')` / `import ... from 'redis-semaphore'` keep working unchanged on Node.js >= 22.12, which supports requiring synchronous ESM graphs unflagged. Only code relying on CommonJS-specific behavior of a deep `require()` into individual files under `lib/` (e.g. mutating `module.exports`) could be affected
- Updated all dependencies and devDependencies to their latest versions
- Raised TypeScript build target to `ES2022`
- Migrated the test suite from Mocha/nyc to Vitest
- Replaced ESLint/typescript-eslint with [oxlint](https://oxc.rs/) (including type-aware linting via `oxlint-tsgolint`) for faster linting; no change for library consumers
- Raised the development-only TypeScript version to 7.x, required by oxlint's type-aware linting
- Removed `chai`, `chai-as-promised`, `sinon` and `sinon-chai` from the test suite in favor of Vitest's built-in `expect`/`vi` APIs; no change for library consumers
- Fixed two incorrect internal type assertions found by oxlint's type-aware linting (no runtime behavior change)
- CI now runs the test suite against `ioredis` `^4.1.0`, `^5` and `^6` (the full supported peer dependency range) in addition to the default version, to catch regressions for consumers on an older `ioredis` major

### redis-semaphore@5.8.0

- Added `ioredis` v6 to the supported peer dependency range (`^4.1.0 || ^5 || ^6`)
- Test suite now runs against `ioredis` 6, which uses RESP3 by default

### redis-semaphore@5.7.0

- Added `AbortSignal` to acquire

### redis-semaphore@5.6.2

- Fixed implicit import from `src`
- Removed `src` folder from NPM package

### redis-semaphore@5.6.1

- Removed `module` field from `package.json`

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
