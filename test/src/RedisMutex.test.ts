import { Redis } from 'ioredis'
import LostLockError from '../../src/errors/LostLockError'
import Mutex from '../../src/RedisMutex'
import { TimeoutOptions } from '../../src/types'
import { delay } from '../../src/utils/index'
import { client1 as client, clientMock1 as clientMock } from '../redisClient'
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
    expect(() => new Mutex(null as unknown as Redis, 'key')).toThrow(
      '"client" is required'
    )
    expect(() => new Mutex(client, '')).toThrow('"key" is required')
    expect(() => new Mutex(client, 1 as unknown as string)).toThrow(
      '"key" must be a string'
    )
    expect(() => new Mutex(client, 'key', { identifier: '' })).toThrow(
      'identifier must be not empty random string'
    )
    expect(
      () => new Mutex(client, 'key', { acquiredExternally: true })
    ).toThrow('acquiredExternally=true meanless without custom identifier')
    expect(
      () =>
        new Mutex(client, 'key', {
          externallyAcquiredIdentifier: '123',
          identifier: '123'
        })
    ).toThrow(
      'Invalid usage. Use custom identifier and acquiredExternally: true'
    )
    expect(
      () =>
        new Mutex(client, 'key', {
          externallyAcquiredIdentifier: '123',
          acquiredExternally: true,
          identifier: '123'
        })
    ).toThrow(
      'Invalid usage. Use custom identifier and acquiredExternally: true'
    )
  })
  it('should set default options', () => {
    expect(new Mutex(client, 'key', {})).toBeTruthy()
    expect(new Mutex(client, 'key')).toBeTruthy()
  })
  it('should set random UUID as identifier', () => {
    expect(new Mutex(client, 'key').identifier).toMatch(
      /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/
    )
  })
  it('should add identifier suffix', () => {
    expect(
      new Mutex(client, 'key', { identifierSuffix: 'abc' }).identifier
    ).toMatch(
      /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}-abc$/
    )
  })
  it('should use custom identifier if provided', () => {
    expect(
      new Mutex(client, 'key', { identifier: 'abc' }).identifier
    ).toEqual('abc')
  })
  it('should acquire and release lock', async () => {
    const mutex = new Mutex(client, 'key')
    expect(mutex.isAcquired).toBe(false)
    await mutex.acquire()
    expect(mutex.isAcquired).toBe(true)
    expect(await client.get('mutex:key')).toEqual(mutex.identifier)
    await mutex.release()
    expect(mutex.isAcquired).toBe(false)
    expect(await client.get('mutex:key')).toEqual(null)
  })
  it('should reject after timeout', async () => {
    const mutex1 = new Mutex(client, 'key', timeoutOptions)
    const mutex2 = new Mutex(client, 'key', timeoutOptions)
    await mutex1.acquire()
    await expect(mutex2.acquire()).rejects.toThrow(
      'Acquire mutex mutex:key timeout'
    )
    await mutex1.release()
    expect(await client.get('mutex:key')).toEqual(null)
  })
  it('should abort when the given signal is aborted', async () => {
    const mutex1 = new Mutex(client, 'key', timeoutOptions)
    const mutex2 = new Mutex(client, 'key', timeoutOptions)
    await mutex1.acquire()
    await expect(mutex2.acquire(AbortSignal.timeout(10))).rejects.toThrow(
      'The operation was aborted due to timeout'
    )
    await mutex1.release()
    expect(await client.get('mutex:key')).toEqual(null)
  })
  it('should return false for tryAcquire after timeout', async () => {
    const mutex1 = new Mutex(client, 'key', timeoutOptions)
    const mutex2 = new Mutex(client, 'key', timeoutOptions)
    await mutex1.acquire()
    const result = await mutex2.tryAcquire()
    expect(result).toBe(false)
    await mutex1.release()
    expect(await client.get('mutex:key')).toEqual(null)
  })
  it('should return true for successful tryAcquire', async () => {
    const mutex = new Mutex(client, 'key', timeoutOptions)
    const result = await mutex.tryAcquire()
    expect(result).toBe(true)
    await mutex.release()
    expect(await client.get('mutex:key')).toEqual(null)
  })
  it('should refresh lock every refreshInterval ms until release', async () => {
    const mutex = new Mutex(client, 'key', timeoutOptions)
    await mutex.acquire()
    await delay(400)
    expect(await client.get('mutex:key')).toEqual(mutex.identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).toEqual(null)
  })
  it('should stop refreshing lock every refreshInterval ms if stopped', async () => {
    const mutex = new Mutex(client, 'key', timeoutOptions)
    await mutex.acquire()
    mutex.stopRefresh()
    await delay(400)
    expect(await client.get('mutex:key')).toEqual(null)
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
    expect(callCount).toEqual(2) // not floor(400/80) = 9
  })

  it('should support externally acquired mutex (deprecated interface)', async () => {
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
    expect(await client.get('mutex:key')).toEqual(localMutex.identifier)
    await localMutex.release()
    expect(await client.get('mutex:key')).toEqual(null)
  })
  it('should support externally acquired mutex', async () => {
    const externalMutex = new Mutex(client, 'key', {
      ...timeoutOptions,
      refreshInterval: 0
    })
    const localMutex = new Mutex(client, 'key', {
      ...timeoutOptions,
      identifier: externalMutex.identifier,
      acquiredExternally: true
    })
    await externalMutex.acquire()
    await localMutex.acquire()
    await delay(400)
    expect(await client.get('mutex:key')).toEqual(localMutex.identifier)
    await localMutex.release()
    expect(await client.get('mutex:key')).toEqual(null)
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
      expect(mutex.isAcquired).toBe(true)
      await client.set('mutex:key', '222') // another instance
      await delay(200)
      expect(mutex.isAcquired).toBe(false)
      expect(unhandledRejectionSpy).toHaveBeenCalled()
      expect(unhandledRejectionSpy.mock.calls[0][0] instanceof LostLockError)
        .toBe(true)
    })
    it('should throw unhandled error if lock was lost between refreshes (lock expired)', async () => {
      const mutex = new Mutex(client, 'key', timeoutOptions)
      await mutex.acquire()
      expect(mutex.isAcquired).toBe(true)
      await client.del('mutex:key') // expired
      await delay(200)
      expect(mutex.isAcquired).toBe(false)
      expect(unhandledRejectionSpy).toHaveBeenCalled()
      expect(unhandledRejectionSpy.mock.calls[0][0] instanceof LostLockError)
        .toBe(true)
    })
    it('should call onLockLost callback if provided (another instance acquired)', async () => {
      const onLockLostCallback = vi.fn<(this: Mutex, err: LostLockError) => void>(function (this: Mutex) {
        expect(this.isAcquired).toBe(false)
      })
      const mutex = new Mutex(client, 'key', {
        ...timeoutOptions,
        onLockLost: onLockLostCallback
      })
      await mutex.acquire()
      expect(mutex.isAcquired).toBe(true)
      await client.set('mutex:key', '222') // another instance
      await delay(200)
      expect(mutex.isAcquired).toBe(false)
      expect(unhandledRejectionSpy).not.toHaveBeenCalled()
      expect(onLockLostCallback).toHaveBeenCalled()
      expect(
        onLockLostCallback.mock.calls[0][0] instanceof LostLockError
      ).toBe(true)
    })
    it('should call onLockLost callback if provided (lock expired)', async () => {
      const onLockLostCallback = vi.fn<(this: Mutex, err: LostLockError) => void>(function (this: Mutex) {
        expect(this.isAcquired).toBe(false)
      })
      const mutex = new Mutex(client, 'key', {
        ...timeoutOptions,
        onLockLost: onLockLostCallback
      })
      await mutex.acquire()
      expect(mutex.isAcquired).toBe(true)
      await client.del('mutex:key') // expired
      await delay(200)
      expect(mutex.isAcquired).toBe(false)
      expect(unhandledRejectionSpy).not.toHaveBeenCalled()
      expect(onLockLostCallback).toHaveBeenCalled()
      expect(
        onLockLostCallback.mock.calls[0][0] instanceof LostLockError
      ).toBe(true)
    })
  })
  it('should be reusable', async () => {
    const mutex = new Mutex(client, 'key', timeoutOptions)

    /* Lifecycle 1 */
    await mutex.acquire()
    await delay(300)
    expect(await client.get('mutex:key')).toEqual(mutex.identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).toEqual(null)
    await delay(300)
    expect(await client.get('mutex:key')).toEqual(null)

    await delay(300)

    /* Lifecycle 2 */
    await mutex.acquire()
    await delay(300)
    expect(await client.get('mutex:key')).toEqual(mutex.identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).toEqual(null)
    await delay(300)
    expect(await client.get('mutex:key')).toEqual(null)

    await delay(300)

    /* Lifecycle 3 */
    await mutex.acquire()
    await delay(300)
    expect(await client.get('mutex:key')).toEqual(mutex.identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).toEqual(null)
    await delay(300)
    expect(await client.get('mutex:key')).toEqual(null)
  }, 10000)
  describe('[Node shutdown]', () => {
    beforeEach(() => {
      catchUnhandledRejection()
    })
    afterEach(async () => {
      throwUnhandledRejection()
      await upRedisServer(1)
    })
    it('should lost lock when node become alive', async () => {
      const onLockLostCallback = vi.fn<(this: Mutex, err: LostLockError) => void>(function (this: Mutex) {
        expect(this.isAcquired).toBe(false)
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

      expect(await client.get('mutex:key')).toEqual(null)
      expect(onLockLostCallback).toHaveBeenCalled()
      expect(
        onLockLostCallback.mock.calls[0][0] instanceof LostLockError
      ).toBe(true)

      // lock was not reacquired by mutex1, so mutex2 can acquire the lock

      const mutex2 = new Mutex(client, 'key', timeoutOptions)
      await mutex2.acquire()
      expect(await client.get('mutex:key')).toEqual(mutex2.identifier)

      await Promise.all([mutex1.release(), mutex2.release()])
    }, 60000)
  })
  describe('ioredis-mock support', async () => {
    it('should acquire and release lock', async () => {
      const mutex = new Mutex(clientMock, 'key')
      expect(mutex.isAcquired).toBe(false)
      await mutex.acquire()
      expect(mutex.isAcquired).toBe(true)
      expect(await clientMock.get('mutex:key')).toEqual(mutex.identifier)
      await mutex.release()
      expect(mutex.isAcquired).toBe(false)
      expect(await clientMock.get('mutex:key')).toEqual(null)
    })
  })
})
