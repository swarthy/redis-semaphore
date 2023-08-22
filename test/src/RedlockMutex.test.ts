import { expect } from 'chai'
import { Redis } from 'ioredis'
import sinon from 'sinon'

import LostLockError from '../../src/errors/LostLockError'
import RedlockMutex from '../../src/RedlockMutex'
import { TimeoutOptions } from '../../src/types'
import { delay } from '../../src/utils/index'
import { allClients, client1, client2, client3 } from '../redisClient'
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

async function expectGetAll(key: string, value: string | null) {
  await expect(
    Promise.all([client1.get(key), client2.get(key), client3.get(key)])
  ).to.become([value, value, value])
}

describe('RedlockMutex', () => {
  it('should fail on invalid arguments', () => {
    expect(() => new RedlockMutex(null as unknown as Redis[], 'key')).to.throw(
      '"clients" array is required'
    )
    expect(() => new RedlockMutex([{}] as unknown as Redis[], 'key')).to.throw(
      '"client" must be instance of ioredis client'
    )
    expect(() => new RedlockMutex(allClients, '')).to.throw('"key" is required')
    expect(() => new RedlockMutex(allClients, 1 as unknown as string)).to.throw(
      '"key" must be a string'
    )
  })
  it('should acquire and release lock', async () => {
    const mutex = new RedlockMutex(allClients, 'key')
    expect(mutex.isAcquired).to.be.false

    await mutex.acquire()
    expect(mutex.isAcquired).to.be.true
    await expectGetAll('mutex:key', mutex.identifier)

    await mutex.release()
    expect(mutex.isAcquired).to.be.false
    await expectGetAll('mutex:key', null)
  })
  it('should reject after timeout', async () => {
    const mutex1 = new RedlockMutex(allClients, 'key', timeoutOptions)
    const mutex2 = new RedlockMutex(allClients, 'key', timeoutOptions)
    await mutex1.acquire()
    await expect(mutex2.acquire()).to.be.rejectedWith(
      'Acquire redlock-mutex mutex:key timeout'
    )
    await mutex1.release()
    await expectGetAll('mutex:key', null)
  })
  it('should refresh lock every refreshInterval ms until release', async () => {
    const mutex = new RedlockMutex(allClients, 'key', timeoutOptions)
    await mutex.acquire()
    await delay(400)
    await expectGetAll('mutex:key', mutex.identifier)
    await mutex.release()
    await expectGetAll('mutex:key', null)
  })
  it('should stop refreshing if stopped', async () => {
    const mutex = new RedlockMutex(allClients, 'key', timeoutOptions)
    await mutex.acquire()
    mutex.stopRefresh()
    await delay(400)
    await expectGetAll('mutex:key', null)
  })
  it('should support externally acquired mutex (deprecated interface)', async () => {
    const externalMutex = new RedlockMutex(allClients, 'key', {
      ...timeoutOptions,
      refreshInterval: 0
    })
    const localMutex = new RedlockMutex(allClients, 'key', {
      ...timeoutOptions,
      externallyAcquiredIdentifier: externalMutex.identifier
    })
    await externalMutex.acquire()
    await localMutex.acquire()
    await delay(400)
    await expectGetAll('mutex:key', localMutex.identifier)
    await localMutex.release()
    await expectGetAll('mutex:key', null)
  })
  it('should support externally acquired mutex', async () => {
    const externalMutex = new RedlockMutex(allClients, 'key', {
      ...timeoutOptions,
      refreshInterval: 0
    })
    const localMutex = new RedlockMutex(allClients, 'key', {
      ...timeoutOptions,
      identifier: externalMutex.identifier,
      acquiredExternally: true
    })
    await externalMutex.acquire()
    await localMutex.acquire()
    await delay(400)
    await expectGetAll('mutex:key', localMutex.identifier)
    await localMutex.release()
    await expectGetAll('mutex:key', null)
  })
  describe('lost lock case', () => {
    beforeEach(() => {
      catchUnhandledRejection()
    })
    afterEach(() => {
      throwUnhandledRejection()
    })
    it('should throw unhandled error if lock is lost between refreshes', async () => {
      const mutex = new RedlockMutex(allClients, 'key', timeoutOptions)
      await mutex.acquire()
      await Promise.all([
        client1.set('mutex:key', '222'), // another instance
        client2.set('mutex:key', '222'), // another instance
        client3.set('mutex:key', '222') // another instance
      ])
      await delay(200)
      expect(unhandledRejectionSpy).to.be.called
      expect(unhandledRejectionSpy.firstCall.firstArg instanceof LostLockError)
        .to.be.true
    })
    it('should call onLockLost callback if provided', async () => {
      const onLockLostCallback = sinon.spy(function (this: RedlockMutex) {
        expect(this.isAcquired).to.be.false
      })
      const mutex = new RedlockMutex(allClients, 'key', {
        ...timeoutOptions,
        onLockLost: onLockLostCallback
      })
      await mutex.acquire()
      expect(mutex.isAcquired).to.be.true
      await Promise.all([
        client1.set('mutex:key', '222'), // another instance
        client2.set('mutex:key', '222'), // another instance
        client3.set('mutex:key', '222') // another instance
      ])
      await delay(200)
      expect(mutex.isAcquired).to.be.false
      expect(unhandledRejectionSpy).to.not.called
      expect(onLockLostCallback).to.be.called
      expect(onLockLostCallback.firstCall.firstArg instanceof LostLockError).to
        .be.true
    })
  })
  it('should be reusable', async () => {
    const mutex = new RedlockMutex(allClients, 'key', timeoutOptions)

    /* Lifecycle 1 */
    await mutex.acquire()
    await delay(100)
    await expectGetAll('mutex:key', mutex.identifier)
    await mutex.release()
    await expectGetAll('mutex:key', null)
    await delay(100)
    await expectGetAll('mutex:key', null)

    await delay(100)

    /* Lifecycle 2 */
    await mutex.acquire()
    await delay(100)
    await expectGetAll('mutex:key', mutex.identifier)
    await mutex.release()
    await expectGetAll('mutex:key', null)
    await delay(100)
    await expectGetAll('mutex:key', null)

    await delay(100)

    /* Lifecycle 3 */
    await mutex.acquire()
    await delay(100)
    await expectGetAll('mutex:key', mutex.identifier)
    await mutex.release()
    await expectGetAll('mutex:key', null)
    await delay(100)
    await expectGetAll('mutex:key', null)
  })
  describe('[Node shutdown]', () => {
    afterEach(async () => {
      await Promise.all([upRedisServer(1), upRedisServer(2), upRedisServer(3)])
    })
    it('should handle server shutdown if quorum is alive', async function () {
      this.timeout(60000)
      const mutex1 = new RedlockMutex(allClients, 'key', timeoutOptions)
      await mutex1.acquire()

      // <Server1Failure>
      await downRedisServer(1)
      console.log('SHUT DOWN 1')

      await delay(1000)

      // lock survive in server2 and server3
      // mutex2 will NOT be able to acquire the lock

      const mutex2 = new RedlockMutex(allClients, 'key', timeoutOptions)
      await expect(mutex2.acquire()).to.be.rejectedWith(
        'Acquire redlock-mutex mutex:key timeout'
      )

      // key in server1 has expired now

      await upRedisServer(1)
      console.log('ONLINE 1')

      // let mutex1 to refresh lock on server1
      await delay(1000)
      expect(await client1.get('mutex:key')).to.be.eql(mutex1.identifier)
      // </Server1Failure>

      // <Server2Failure>
      await downRedisServer(2)
      console.log('SHUT DOWN 2')

      await delay(1000)

      // lock survive in server1 and server3
      // mutex3 will NOT be able to acquire the lock

      const mutex3 = new RedlockMutex(allClients, 'key', timeoutOptions)
      await expect(mutex3.acquire()).to.be.rejectedWith(
        'Acquire redlock-mutex mutex:key timeout'
      )

      // key in server2 has expired now

      await upRedisServer(2)
      console.log('ONLINE 2')

      // let mutex1 to refresh lock on server2
      await delay(1000)
      expect(await client2.get('mutex:key')).to.be.eql(mutex1.identifier)
      // </Server2Failure>

      // <Server3Failure>
      await downRedisServer(3)
      console.log('SHUT DOWN 3')

      await delay(1000)

      // lock survive in server1 and server2
      // mutex4 will NOT be able to acquire the lock

      const mutex4 = new RedlockMutex(allClients, 'key', timeoutOptions)
      await expect(mutex4.acquire()).to.be.rejectedWith(
        'Acquire redlock-mutex mutex:key timeout'
      )

      // key in server3 has expired now

      await upRedisServer(3)
      console.log('ONLINE 3')

      // let mutex1 to refresh lock on server3
      await delay(1000)
      expect(await client3.get('mutex:key')).to.be.eql(mutex1.identifier)
      // </Server3Failure>

      await mutex1.release()
    })
    it('should fail and release when quorum is become dead', async function () {
      this.timeout(60000)
      const onLockLostCallback = sinon.spy(function (this: RedlockMutex) {
        expect(this.isAcquired).to.be.false
      })
      const mutex1 = new RedlockMutex(allClients, 'key', {
        ...timeoutOptions,
        onLockLost: onLockLostCallback
      })
      await mutex1.acquire()

      await downRedisServer(1)
      console.log('SHUT DOWN 1')

      await downRedisServer(2)
      console.log('SHUT DOWN 2')

      await delay(1000)

      expect(onLockLostCallback).to.be.called
      expect(onLockLostCallback.firstCall.firstArg instanceof LostLockError).to
        .be.true

      // released lock on server3
      expect(await client3.get('mutex:key')).to.be.eql(null)

      // mutex2 will NOT be able to acquire the lock cause quorum is dead

      const mutex2 = new RedlockMutex(allClients, 'key', timeoutOptions)
      await expect(mutex2.acquire()).to.be.rejectedWith(
        'Acquire redlock-mutex mutex:key timeout'
      )
    })
  })
})
