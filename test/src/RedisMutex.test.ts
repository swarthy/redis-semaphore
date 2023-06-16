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
  catchUnhandledRejection,
  throwUnhandledRejection,
  unhandledRejectionSpy
} from '../unhandledRejection'

const timeoutOptions: TimeoutOptions = {
  lockTimeout: 300,
  acquireTimeout: 100,
  refreshInterval: 80,
  retryInterval: 10
}

describe('Mutex', () => {
  it('should fail on invalid arguments', () => {
    expect(() => new Mutex(null as unknown as Redis, 'key')).to.throw(
      '"client" is required'
    )
    expect(() => new Mutex({} as unknown as Redis, 'key')).to.throw(
      '"client" must be instance of ioredis client'
    )
    expect(() => new Mutex(client, '')).to.throw('"key" is required')
    expect(() => new Mutex(client, 1 as unknown as string)).to.throw(
      '"key" must be a string'
    )
  })
  it('should set default options', () => {
    expect(new Mutex(client, 'key', {})).to.be.ok
    expect(new Mutex(client, 'key')).to.be.ok
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
  it('should return false for tryAcquire after timeout', async () => {
    const mutex1 = new Mutex(client, 'key', timeoutOptions)
    const mutex2 = new Mutex(client, 'key', timeoutOptions)
    await mutex1.acquire()
    const result = await mutex2.tryAcquire()
    expect(result).to.be.false
    await mutex1.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  it('should return true for successful tryAcquire', async () => {
    const mutex = new Mutex(client, 'key', timeoutOptions)
    const result = await mutex.tryAcquire()
    expect(result).to.be.true
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  it('should refresh lock every refreshInterval ms until release', async () => {
    const mutex = new Mutex(client, 'key', timeoutOptions)
    await mutex.acquire()
    await delay(400)
    expect(await client.get('mutex:key')).to.be.eql(mutex.identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  it('should stop refreshing lock every refreshInterval ms if stopped', async () => {
    const mutex = new Mutex(client, 'key', timeoutOptions)
    await mutex.acquire()
    mutex.stopRefresh()
    await delay(400)
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  it('should not call _refresh if already refreshing', async () => {
    const mutex = new Mutex(client, 'key', timeoutOptions)
    let callCount = 0
    Object.assign(mutex, {
      _refresh: () =>
        delay(100).then(() => {
          callCount++
          return true
        })
    })
    await mutex.acquire()
    await delay(400)
    expect(callCount).to.be.eql(2) // not floor(400/80) = 9
  })

  it('should support externally acquired mutex', async () => {
    const externalMutex = new Mutex(client, 'key', {
      ...timeoutOptions,
      refreshInterval: 0
    })
    const localMutex = new Mutex(client, 'key', {
      ...timeoutOptions,
      externallyAcquiredIdentifier: externalMutex.identifier
    })
    await externalMutex.acquire()
    await localMutex.acquire()
    await delay(400)
    expect(await client.get('mutex:key')).to.be.eql(localMutex.identifier)
    await localMutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  describe('lost lock case', () => {
    beforeEach(() => {
      catchUnhandledRejection()
    })
    afterEach(() => {
      throwUnhandledRejection()
    })
    it('should throw unhandled error if lock was lost between refreshes (another instance acquired)', async () => {
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
    it('should throw unhandled error if lock was lost between refreshes (lock expired)', async () => {
      const mutex = new Mutex(client, 'key', timeoutOptions)
      await mutex.acquire()
      expect(mutex.isAcquired).to.be.true
      await client.del('mutex:key') // expired
      await delay(200)
      expect(mutex.isAcquired).to.be.false
      expect(unhandledRejectionSpy).to.be.called
      expect(unhandledRejectionSpy.firstCall.firstArg instanceof LostLockError)
        .to.be.true
    })
    it('should call onLockLost callback if provided (another instance acquired)', async () => {
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
    it('should call onLockLost callback if provided (lock expired)', async () => {
      const onLockLostCallback = sinon.spy(function (this: Mutex) {
        expect(this.isAcquired).to.be.false
      })
      const mutex = new Mutex(client, 'key', {
        ...timeoutOptions,
        onLockLost: onLockLostCallback
      })
      await mutex.acquire()
      expect(mutex.isAcquired).to.be.true
      await client.del('mutex:key') // expired
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
    it('should lost lock when node become alive', async function () {
      this.timeout(60000)
      const onLockLostCallback = sinon.spy(function (this: Mutex) {
        expect(this.isAcquired).to.be.false
      })
      const mutex1 = new Mutex(client, 'key', {
        ...timeoutOptions,
        onLockLost: onLockLostCallback
      })
      await mutex1.acquire()
      await downRedisServer(1)

      await delay(1000)
      // lock expired now

      await upRedisServer(1)
      // mutex was expired, key was deleted in redis
      // give refresh mechanism time to detect lock lost
      // (includes client reconnection time)
      await delay(1000)

      expect(await client.get('mutex:key')).to.be.eql(null)
      expect(onLockLostCallback).to.be.called
      expect(onLockLostCallback.firstCall.firstArg instanceof LostLockError).to
        .be.true

      // lock was not reacquired by mutex1, so mutex2 can acquire the lock

      const mutex2 = new Mutex(client, 'key', timeoutOptions)
      await mutex2.acquire()
      expect(await client.get('mutex:key')).to.be.eql(mutex2.identifier)

      await Promise.all([mutex1.release(), mutex2.release()])
    })
  })
})
