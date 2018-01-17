# redis-semaphore

[![NPM version][npm-image]][npm-url]
[![Build status][ci-image]][ci-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![Coverage Status][coverage-image]][coverage-url]
[![Code Climate][codeclimate-image]][codeclimate-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]

[Mutex](<https://en.wikipedia.org/wiki/Lock_(computer_science)>) and [Semaphore](<https://en.wikipedia.org/wiki/Semaphore_(programming)>) implementations based on [Redis](https://redis.io/) ready for distributed systems

## Features

* Fail-safe (all actions performed by LUA scripts (atomic))

## Usage

### Mutex

##### new Mutex(redisClient, key [, { lockTimeout = 10000, acquireTimeout = 10000, retryInterval = 10, refreshInterval = acquireTimeout * 0.8 }])

* `redisClient` - **required**, configured `redis` client
* `key` - **required**, key for locking resource (final key in redis: `mutex:<key>`)
* `timeouts` _optional_
  * `lockTimeout` - ms, time after mutex will be auto released (expired)
  * `acquireTimeout` - ms, max timeout for `.acquire()` call
  * `retryInterval` - ms, time between acquire attempts if resource locked
  * `refreshInterval` - ms, auto-refresh interval

#### Example

```javascript
const Mutex = require('redis-semaphore').Mutex
const redis = require('redis')

const redisClient = redis.createClient()

async function doSomething() {
  const mutex = new Mutex(redisClient, 'lockingResource')
  await mutex.acquire()
  // critical code
  await mutex.release()
}
```

### Semaphore

##### new Semaphore(redisClient, key, maxCount [, { lockTimeout = 10000, acquireTimeout = 10000, retryInterval = 10, refreshInterval = acquireTimeout * 0.8 }])

* `redisClient` - **required**, configured `redis` client
* `key` - **required**, key for locking resource (final key in redis: `semaphore:<key>`)
* `maxCount` - **required**, maximum simultaneously resource usage count
* `timeouts` _optional_
  * `lockTimeout` - ms, time after semaphore will be auto released (expired)
  * `acquireTimeout` - ms, max timeout for `.acquire()` call
  * `retryInterval` - ms, time between acquire attempts if resource locked
  * `refreshInterval` - ms, auto-refresh interval

#### Example

```javascript
const Semaphore = require('redis-semaphore').Semaphore
const redis = require('redis')

const redisClient = redis.createClient()

async function doSomething() {
  const semaphore = new Semaphore(redisClient, 'lockingResource', 5)
  await semaphore.acquire()
  // maximum 5 simultaneously executions
  await semaphore.release()
}
```

## Installation

```bash
npm install --save redis-semaphore
# or
yarn add redis-semaphore
```

## License

MIT

[npm-image]: https://img.shields.io/npm/v/redis-semaphore.svg?style=flat-square
[npm-url]: https://npmjs.org/package/redis-semaphore
[ci-image]: https://img.shields.io/travis/swarthy/redis-semaphore/master.svg?style=flat-square
[ci-url]: https://travis-ci.org/swarthy/redis-semaphore
[daviddm-image]: http://img.shields.io/david/swarthy/redis-semaphore.svg?style=flat-square
[daviddm-url]: https://david-dm.org/swarthy/redis-semaphore
[codeclimate-image]: https://img.shields.io/codeclimate/github/swarthy/redis-semaphore.svg?style=flat-square
[codeclimate-url]: https://codeclimate.com/github/swarthy/redis-semaphore
[snyk-image]: https://snyk.io/test/npm/redis-semaphore/badge.svg
[snyk-url]: https://snyk.io/test/npm/redis-semaphore
[coverage-image]: https://coveralls.io/repos/github/swarthy/redis-semaphore/badge.svg?branch=master
[coverage-url]: https://coveralls.io/r/swarthy/redis-semaphore?branch=master
