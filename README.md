# redis-semaphore

[![NPM version][npm-image]][npm-url]
[![Build status][ci-image]][ci-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![Coverage Status][coverage-image]][coverage-url]
[![Maintainability][codeclimate-image]][codeclimate-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![FOSSA Status][fossa-badge-image]][fossa-badge-url]

[Mutex](<https://en.wikipedia.org/wiki/Lock_(computer_science)>) and [Semaphore](<https://en.wikipedia.org/wiki/Semaphore_(programming)>) implementations based on [Redis](https://redis.io/) ready for distributed systems

## Features

- Fail-safe (all actions performed by LUA scripts (atomic))

## Usage

### Installation

```bash
npm install --save redis-semaphore ioredis
# or
yarn add redis-semaphore ioredis
```

### Mutex

> See [RedisLabs: Locks with timeouts](https://redislabs.com/ebook/part-2-core-concepts/chapter-6-application-components-in-redis/6-2-distributed-locking/6-2-5-locks-with-timeouts/)

##### new Mutex(redisClient, key [, { lockTimeout = 10000, acquireTimeout = 10000, retryInterval = 10, refreshInterval = lockTimeout * 0.8 }])

- `redisClient` - **required**, configured `redis` client
- `key` - **required**, key for locking resource (final key in redis: `mutex:<key>`)
- `timeouts` _optional_
  - `lockTimeout` - ms, time after mutex will be auto released (expired)
  - `acquireTimeout` - ms, max timeout for `.acquire()` call
  - `retryInterval` - ms, time between acquire attempts if resource locked
  - `refreshInterval` - ms, auto-refresh interval

#### Example

```javascript
const Mutex = require('redis-semaphore').Mutex
const Redis = require('ioredis')

const redisClient = new Redis()

async function doSomething() {
  const mutex = new Mutex(redisClient, 'lockingResource')
  await mutex.acquire()
  // critical code
  await mutex.release()
}
```

### Semaphore

> See [RedisLabs: Basic counting sempahore](https://redislabs.com/ebook/part-2-core-concepts/chapter-6-application-components-in-redis/6-3-counting-semaphores/6-3-1-building-a-basic-counting-semaphore/)

##### new Semaphore(redisClient, key, maxCount [, { lockTimeout = 10000, acquireTimeout = 10000, retryInterval = 10, refreshInterval = lockTimeout * 0.8 }])

- `redisClient` - **required**, configured `redis` client
- `key` - **required**, key for locking resource (final key in redis: `semaphore:<key>`)
- `maxCount` - **required**, maximum simultaneously resource usage count
- `timeouts` _optional_
  - `lockTimeout` - ms, time after semaphore will be auto released (expired)
  - `acquireTimeout` - ms, max timeout for `.acquire()` call
  - `retryInterval` - ms, time between acquire attempts if resource locked
  - `refreshInterval` - ms, auto-refresh interval

#### Example

```javascript
const Semaphore = require('redis-semaphore').Semaphore
const Redis = require('ioredis')

const redisClient = new Redis()

async function doSomething() {
  const semaphore = new Semaphore(redisClient, 'lockingResource', 5)
  await semaphore.acquire()
  // maximum 5 simultaneously executions
  await semaphore.release()
}
```

### Fair Semaphore

> See [RedisLabs: Fair semaphore](https://redislabs.com/ebook/part-2-core-concepts/chapter-6-application-components-in-redis/6-3-counting-semaphores/6-3-2-fair-semaphores/)

##### new FairSemaphore(redisClient, key, maxCount [, { lockTimeout = 10000, acquireTimeout = 10000, retryInterval = 10, refreshInterval = lockTimeout * 0.8 }])

- `redisClient` - **required**, configured `redis` client
- `key` - **required**, key for locking resource (final key in redis: `semaphore:<key>`)
- `maxCount` - **required**, maximum simultaneously resource usage count
- `timeouts` _optional_
  - `lockTimeout` - ms, time after semaphore will be auto released (expired)
  - `acquireTimeout` - ms, max timeout for `.acquire()` call
  - `retryInterval` - ms, time between acquire attempts if resource locked
  - `refreshInterval` - ms, auto-refresh interval

#### Example

```javascript
const FairSemaphore = require('redis-semaphore').FairSemaphore
const Redis = require('ioredis')

const redisClient = new Redis()

async function doSomething() {
  const semaphore = new FairSemaphore(redisClient, 'lockingResource', 5)
  await semaphore.acquire()
  // maximum 5 simultaneously executions
  await semaphore.release()
}
```

## License

MIT

[![FOSSA Status][fossa-large-image]][fossa-large-url]

[npm-image]: https://img.shields.io/npm/v/redis-semaphore.svg?style=flat-square
[npm-url]: https://npmjs.org/package/redis-semaphore
[ci-image]: https://img.shields.io/travis/swarthy/redis-semaphore/master.svg?style=flat-square
[ci-url]: https://travis-ci.org/swarthy/redis-semaphore
[daviddm-image]: http://img.shields.io/david/swarthy/redis-semaphore.svg?style=flat-square
[daviddm-url]: https://david-dm.org/swarthy/redis-semaphore
[codeclimate-image]: https://api.codeclimate.com/v1/badges/02778c96bb5983eb150c/maintainability
[codeclimate-url]: https://codeclimate.com/github/swarthy/redis-semaphore/maintainability
[snyk-image]: https://snyk.io/test/npm/redis-semaphore/badge.svg
[snyk-url]: https://snyk.io/test/npm/redis-semaphore
[coverage-image]: https://coveralls.io/repos/github/swarthy/redis-semaphore/badge.svg?branch=master
[coverage-url]: https://coveralls.io/r/swarthy/redis-semaphore?branch=master
[fossa-badge-image]: https://app.fossa.com/api/projects/custom%2B10538%2Fgit%40github.com%3Aswarthy%2Fredis-semaphore.git.svg?type=shield
[fossa-badge-url]: https://app.fossa.com/projects/custom%2B10538%2Fgit%40github.com%3Aswarthy%2Fredis-semaphore.git?ref=badge_shield
[fossa-large-image]: https://app.fossa.com/api/projects/custom%2B10538%2Fgit%40github.com%3Aswarthy%2Fredis-semaphore.git.svg?type=large
[fossa-large-url]: https://app.fossa.com/projects/custom%2B10538%2Fgit%40github.com%3Aswarthy%2Fredis-semaphore.git?ref=badge_large
