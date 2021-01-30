import { expect } from 'chai'
import { Redis } from 'ioredis'
import sinon from 'sinon'

import LostLockError from '../../src/errors/LostLockError'
import Mutex from '../../src/RedisMutex'
import { TimeoutOptions } from '../../src/types'
import { delay } from '../../src/utils/index'
import { client1 as client } from '../redisClient'
import { downRedisServer, upRedisServer } from '../shell'
import {
  catchUnhandledRejection, throwUnhandledRejection, unhandledRejectionSpy
} from '../unhandledRejection'

const timeoutOptions: TimeoutOptions = {
  lockTimeout: 300,
  acquireTimeout: 100,
  refreshInterval: 80,
  retryInterval: 10
}

describe('Mutex', () => {
  it('should fail on invalid arguments', () => {
    expect(() => new Mutex((null as unknown) as Redis, 'key')).to.throw(
      '"client" is required'
    )
    expect(() => new Mutex(({} as unknown) as Redis, 'key')).to.throw(
      '"client" must be instance of ioredis client'
    )
    expect(() => new Mutex(client, '')).to.throw('"key" is required')
    expect(() => new Mutex(client, (1 as unknown) as string)).to.throw(
      '"key" must be a string'
    )
  })
  it('should acquire and release lock', async () => {
    const mutex = new Mutex(client, 'key')
    expect(mutex.isAcquired).to.be.false
    await mutex.acquire()
    expect(mutex.isAcquired).to.be.true
    expect(await client.get('mutex:key')).to.be.eql(mutex.identifier)
    await mutex.release()
    expect(mutex.isAcquired).to.be.false
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  it('should reject after timeout', async () => {
    const mutex1 = new Mutex(client, 'key', timeoutOptions)
    const mutex2 = new Mutex(client, 'key', timeoutOptions)
    await mutex1.acquire()
    await expect(mutex2.acquire()).to.be.rejectedWith(
      'Acquire mutex mutex:key timeout'
    )
    await mutex1.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  it('should refresh lock every refreshInterval ms until release', async () => {
    const mutex = new Mutex(client, 'key', timeoutOptions)
    await mutex.acquire()
    await delay(100)
    expect(await client.get('mutex:key')).to.be.eql(mutex.identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  it('should re-acquire lock if lock was expired between refreshes, but was not acquired by another instance', async () => {
    const mutex = new Mutex(client, 'key', timeoutOptions)
    await mutex.acquire()
    await client.del('mutex:key') // "expired"
    await delay(100)
    expect(await client.get('mutex:key')).to.be.eql(mutex.identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  describe('lost lock case', () => {
    beforeEach(() => {
      catchUnhandledRejection()
    })
    afterEach(() => {
      throwUnhandledRejection()
    })
    it('should throw unhandled error if lock was lost between refreshes', async () => {
      const mutex = new Mutex(client, 'key', timeoutOptions)
      await mutex.acquire()
      expect(mutex.isAcquired).to.be.true
      await client.set('mutex:key', '222') // another instance
      await delay(200)
      expect(mutex.isAcquired).to.be.false
      expect(unhandledRejectionSpy).to.be.called
      expect(unhandledRejectionSpy.firstCall.firstArg instanceof LostLockError)
        .to.be.true
    })
    it('should call onLockLost callback if provided', async () => {
      const onLockLostCallback = sinon.spy(function (this: Mutex) {
        expect(this.isAcquired).to.be.false
      })
      const mutex = new Mutex(client, 'key', {
        ...timeoutOptions,
        onLockLost: onLockLostCallback
      })
      await mutex.acquire()
      expect(mutex.isAcquired).to.be.true
      await client.set('mutex:key', '222') // another instance
      await delay(200)
      expect(mutex.isAcquired).to.be.false
      expect(unhandledRejectionSpy).to.not.called
      expect(onLockLostCallback).to.be.called
      expect(onLockLostCallback.firstCall.firstArg instanceof LostLockError).to
        .be.true
    })
  })
  it('should be reusable', async function () {
    this.timeout(10000)
    const mutex = new Mutex(client, 'key', timeoutOptions)

    /* Lifecycle 1 */
    await mutex.acquire()
    await delay(300)
    expect(await client.get('mutex:key')).to.be.eql(mutex.identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
    await delay(300)
    expect(await client.get('mutex:key')).to.be.eql(null)

    await delay(300)

    /* Lifecycle 2 */
    await mutex.acquire()
    await delay(300)
    expect(await client.get('mutex:key')).to.be.eql(mutex.identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
    await delay(300)
    expect(await client.get('mutex:key')).to.be.eql(null)

    await delay(300)

    /* Lifecycle 3 */
    await mutex.acquire()
    await delay(300)
    expect(await client.get('mutex:key')).to.be.eql(mutex.identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
    await delay(300)
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  describe('[Node shutdown]', () => {
    beforeEach(() => {
      catchUnhandledRejection()
    })
    afterEach(async () => {
      throwUnhandledRejection()
      await upRedisServer(1)
    })
    it('should work again if node become alive', async function () {
      this.timeout(60000)
      const mutex1 = new Mutex(client, 'key', timeoutOptions)
      await mutex1.acquire()
      await downRedisServer(1)
      console.log('SHUT DOWN')

      await delay(1000)
      // lock expired now

      await upRedisServer(1)
      console.log('ONLINE')
      // mutex was expired, key was deleted in redis
      // give refresh mechanism time to reacquire the lock
      // (includes client reconnection time)
      await delay(1000)

      expect(await client.get('mutex:key')).to.be.eql(mutex1.identifier)

      console.log('mutex1 should be reacquired right now')

      // now lock reacquired by mutex1, so mutex2 cant acquire the lock

      const mutex2 = new Mutex(client, 'key', timeoutOptions)
      await expect(mutex2.acquire()).to.be.rejectedWith(
        'Acquire mutex mutex:key timeout'
      )
      await mutex1.release()
    })
  })
})
