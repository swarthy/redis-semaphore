import { Redis } from 'ioredis'
import LostLockError from '../../src/errors/LostLockError'
import MultiSemaphore from '../../src/RedisMultiSemaphore'
import Semaphore from '../../src/RedisSemaphore'
import { TimeoutOptions } from '../../src/types'
import { delay } from '../../src/utils/index'
import { expectMembers } from '../assertions'
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

describe('MultiSemaphore', () => {
  it('should fail on invalid arguments', () => {
    expect(
      () => new MultiSemaphore(null as unknown as Redis, 'key', 5, 2)
    ).toThrow('"client" is required')
    expect(() => new MultiSemaphore(client, '', 5, 2)).toThrow(
      '"key" is required'
    )
    expect(
      () => new MultiSemaphore(client, 1 as unknown as string, 5, 2)
    ).toThrow('"key" must be a string')
    expect(() => new MultiSemaphore(client, 'key', 0, 2)).toThrow(
      '"limit" is required'
    )
    expect(
      () => new MultiSemaphore(client, 'key', '10' as unknown as number, 2)
    ).toThrow('"limit" must be a number')
    expect(() => new MultiSemaphore(client, 'key', 5, 0)).toThrow(
      '"permits" is required'
    )
    expect(
      () => new MultiSemaphore(client, 'key', 5, '2' as unknown as number)
    ).toThrow('"permits" must be a number')
  })
  it('should acquire and release semaphore', async () => {
    const semaphore1 = new MultiSemaphore(client, 'key', 3, 2)
    const semaphore2 = new MultiSemaphore(client, 'key', 3, 1)
    expect(semaphore1.isAcquired).toBe(false)
    expect(semaphore2.isAcquired).toBe(false)

    await semaphore1.acquire()
    expect(semaphore1.isAcquired).toBe(true)
    await semaphore2.acquire()
    expect(semaphore2.isAcquired).toBe(true)
    expectMembers(await client.zrange('semaphore:key', 0, -1), [
      semaphore1.identifier + '_0',
      semaphore1.identifier + '_1',
      semaphore2.identifier + '_0'
    ])

    await semaphore1.release()
    expect(semaphore1.isAcquired).toBe(false)
    expect(await client.zrange('semaphore:key', 0, -1)).toEqual([
      semaphore2.identifier + '_0'
    ])
    await semaphore2.release()
    expect(semaphore2.isAcquired).toBe(false)
    expect(await client.zcard('semaphore:key')).toEqual(0)
  })
  it('should reject after timeout', async () => {
    const semaphore1 = new MultiSemaphore(client, 'key', 3, 3, timeoutOptions)
    const semaphore2 = new MultiSemaphore(client, 'key', 3, 1, timeoutOptions)
    await semaphore1.acquire()
    await expect(semaphore2.acquire()).rejects.toThrow(
      'Acquire multi-semaphore semaphore:key timeout'
    )
    await semaphore1.release()
    expect(await client.get('semaphore:key')).toEqual(null)
  })
  it('should abort when the given signal is aborted', async () => {
    const semaphore1 = new MultiSemaphore(client, 'key', 3, 3, timeoutOptions)
    const semaphore2 = new MultiSemaphore(client, 'key', 3, 1, timeoutOptions)
    await semaphore1.acquire()
    await expect(semaphore2.acquire(AbortSignal.timeout(10))).rejects.toThrow(
      'The operation was aborted due to timeout'
    )
    await semaphore1.release()
    expect(await client.get('semaphore:key')).toEqual(null)
  })
  it('should refresh lock every refreshInterval ms until release', async () => {
    const semaphore1 = new MultiSemaphore(client, 'key', 3, 2, timeoutOptions)
    const semaphore2 = new MultiSemaphore(client, 'key', 3, 1, timeoutOptions)
    await semaphore1.acquire()
    await semaphore2.acquire()
    await delay(400)
    expectMembers(await client.zrange('semaphore:key', 0, -1), [
      semaphore1.identifier + '_0',
      semaphore1.identifier + '_1',
      semaphore2.identifier + '_0'
    ])
    await semaphore1.release()
    expect(await client.zrange('semaphore:key', 0, -1)).toEqual([
      semaphore2.identifier + '_0'
    ])
    await semaphore2.release()
    expect(await client.zcard('semaphore:key')).toEqual(0)
  })
  it('should stop refreshing lock if stopped', async () => {
    const semaphore1 = new MultiSemaphore(client, 'key', 3, 2, timeoutOptions)
    const semaphore2 = new MultiSemaphore(client, 'key', 3, 1, timeoutOptions)
    await semaphore1.acquire()
    await semaphore2.acquire()
    await semaphore1.stopRefresh()
    await delay(400)
    expect(await client.zrange('semaphore:key', 0, -1)).toEqual([
      semaphore2.identifier + '_0'
    ])
    await semaphore2.stopRefresh()
    await delay(400)
    expect(await client.zcard('semaphore:key')).toEqual(0)
  })
  it('should acquire maximum LIMIT semaphores', async () => {
    const s = () =>
      new MultiSemaphore(client, 'key', 3, 1, {
        acquireTimeout: 1000,
        lockTimeout: 50,
        retryInterval: 10,
        refreshInterval: 0 // disable refresh
      })
    const pr1 = Promise.all([s().acquire(), s().acquire(), s().acquire()])
    await delay(5)
    const pr2 = Promise.all([s().acquire(), s().acquire(), s().acquire()])
    await pr1
    const ids1 = await client.zrange('semaphore:key', 0, -1)
    expect(ids1.length).toEqual(3)
    await pr2
    const ids2 = await client.zrange('semaphore:key', 0, -1)
    expect(ids2.length).toEqual(3)
    expect(ids2).not.toContain(ids1[0])
    expect(ids2).not.toContain(ids1[1])
    expect(ids2).not.toContain(ids1[2])
  })
  it('should support externally acquired semaphore (deprecated interface)', async () => {
    const externalSemaphore = new MultiSemaphore(client, 'key', 3, 2, {
      ...timeoutOptions,
      refreshInterval: 0
    })
    const localSemaphore = new MultiSemaphore(client, 'key', 3, 2, {
      ...timeoutOptions,
      externallyAcquiredIdentifier: externalSemaphore.identifier
    })
    await externalSemaphore.acquire()
    await localSemaphore.acquire()
    await delay(400)
    expect(await client.zrange('semaphore:key', 0, -1)).toEqual([
      localSemaphore.identifier + '_0',
      localSemaphore.identifier + '_1'
    ])
    await localSemaphore.release()
    expect(await client.zcard('semaphore:key')).toEqual(0)
  })
  it('should support externally acquired semaphore', async () => {
    const externalSemaphore = new MultiSemaphore(client, 'key', 3, 2, {
      ...timeoutOptions,
      refreshInterval: 0
    })
    const localSemaphore = new MultiSemaphore(client, 'key', 3, 2, {
      ...timeoutOptions,
      identifier: externalSemaphore.identifier,
      acquiredExternally: true
    })
    await externalSemaphore.acquire()
    await localSemaphore.acquire()
    await delay(400)
    expect(await client.zrange('semaphore:key', 0, -1)).toEqual([
      localSemaphore.identifier + '_0',
      localSemaphore.identifier + '_1'
    ])
    await localSemaphore.release()
    expect(await client.zcard('semaphore:key')).toEqual(0)
  })
  describe('lost lock case', () => {
    beforeEach(() => {
      catchUnhandledRejection()
    })
    afterEach(() => {
      throwUnhandledRejection()
    })
    it('should throw unhandled error if lock is lost between refreshes', async () => {
      const semaphore = new MultiSemaphore(client, 'key', 3, 2, timeoutOptions)
      await semaphore.acquire()
      await client.del('semaphore:key')
      await client.zadd(
        'semaphore:key',
        Date.now(),
        'aaa',
        Date.now(),
        'bbb',
        Date.now(),
        'ccc'
      )
      await delay(200)
      expect(unhandledRejectionSpy).toHaveBeenCalled()
      expect(unhandledRejectionSpy.mock.calls[0][0] instanceof LostLockError)
        .toBe(true)
    })
    it('should call onLockLost callback if provided', async () => {
      const onLockLostCallback = vi.fn<(this: MultiSemaphore, err: LostLockError) => void>(function (this: MultiSemaphore) {
        expect(this.isAcquired).toBe(false)
      })
      const semaphore = new MultiSemaphore(client, 'key', 3, 2, {
        ...timeoutOptions,
        onLockLost: onLockLostCallback
      })
      await semaphore.acquire()
      expect(semaphore.isAcquired).toBe(true)
      await client.del('semaphore:key')
      await client.zadd(
        'semaphore:key',
        Date.now(),
        'aaa',
        Date.now(),
        'bbb',
        Date.now(),
        'ccc'
      )
      await delay(200)
      expect(semaphore.isAcquired).toBe(false)
      expect(unhandledRejectionSpy).not.toHaveBeenCalled()
      expect(onLockLostCallback).toHaveBeenCalled()
      expect(
        onLockLostCallback.mock.calls[0][0] instanceof LostLockError
      ).toBe(true)
    })
  })
  describe('reusable', () => {
    it('autorefresh enabled', async () => {
      const semaphore1 = new MultiSemaphore(client, 'key', 4, 2, timeoutOptions)
      const semaphore2 = new MultiSemaphore(client, 'key', 4, 2, timeoutOptions)

      await semaphore1.acquire()
      await semaphore2.acquire()
      await delay(300)
      await semaphore1.release()
      await semaphore2.release()

      await delay(300)

      await semaphore1.acquire()
      await semaphore2.acquire()
      await delay(300)
      await semaphore1.release()
      await semaphore2.release()

      await delay(300)

      await semaphore1.acquire()
      await semaphore2.acquire()
      await delay(300)
      await semaphore1.release()
      await semaphore2.release()
    }, 10000)

    it('autorefresh disabled', async () => {
      const noRefreshOptions = {
        ...timeoutOptions,
        refreshInterval: 0,
        acquireTimeout: 10
      }
      const semaphore1 = new MultiSemaphore(
        client,
        'key',
        4,
        2,
        noRefreshOptions
      )
      const semaphore2 = new MultiSemaphore(
        client,
        'key',
        4,
        2,
        noRefreshOptions
      )
      const semaphore3 = new MultiSemaphore(
        client,
        'key',
        4,
        2,
        noRefreshOptions
      )

      await semaphore1.acquire()
      await semaphore2.acquire()
      await delay(300)
      await semaphore1.release()
      await semaphore2.release()

      await delay(300)

      // [0/2]
      await semaphore1.acquire()
      // [1/2]
      await delay(80)
      await semaphore2.acquire()
      // [2/2]
      await expect(semaphore3.acquire()).rejects.toThrow(
        'Acquire multi-semaphore semaphore:key timeout'
      ) // rejectes after 10ms

      // since semaphore1.acquire() elapsed 80ms (delay) + 10ms (semaphore3 timeout)
      // semaphore1 will expire after 300 - 90 = 210ms
      await delay(210)

      // [1/2]
      await semaphore3.acquire()
    })
  })
  describe('Compatibility with Semaphore', () => {
    it('should work with Semaphore', async () => {
      const multiSemaphore1 = new MultiSemaphore(
        client,
        'key',
        3,
        2,
        timeoutOptions
      )
      const multiSemaphore2 = new MultiSemaphore(
        client,
        'key',
        3,
        2,
        timeoutOptions
      )
      const semaphore1 = new Semaphore(client, 'key', 3, timeoutOptions)
      const semaphore2 = new Semaphore(client, 'key', 3, timeoutOptions)
      await multiSemaphore1.acquire()
      await semaphore1.acquire()
      expectMembers(await client.zrange('semaphore:key', 0, -1), [
        multiSemaphore1.identifier + '_0',
        multiSemaphore1.identifier + '_1',
        semaphore1.identifier
      ])
      await expect(multiSemaphore2.acquire()).rejects.toThrow(
        'Acquire multi-semaphore semaphore:key timeout'
      )
      await expect(semaphore2.acquire()).rejects.toThrow(
        'Acquire semaphore semaphore:key timeout'
      )
      await multiSemaphore1.release()
      expect(await client.zrange('semaphore:key', 0, -1)).toEqual([
        semaphore1.identifier
      ])
      await semaphore1.release()
      expect(await client.zcard('semaphore:key')).toEqual(0)
    })
  })
  describe('[Node shutdown]', () => {
    beforeEach(() => {
      catchUnhandledRejection()
    })
    afterEach(async () => {
      throwUnhandledRejection()
      await upRedisServer(1)
    })
    it('should lost lock when node become alive', async () => {
      const onLockLostCallback = vi.fn<(this: Semaphore, err: LostLockError) => void>(function (this: Semaphore) {
        expect(this.isAcquired).toBe(false)
      })
      const semaphore1 = new MultiSemaphore(client, 'key', 3, 2, {
        ...timeoutOptions,
        onLockLost: onLockLostCallback
      })
      await semaphore1.acquire()

      await downRedisServer(1)
      console.log('SHUT DOWN')

      await delay(1000)

      await upRedisServer(1)
      console.log('ONLINE')

      // semaphore was expired, key was deleted in redis
      // give refresh mechanism time to detect lock lost
      // (includes reconnection time)
      await delay(1000)

      const data1 = await client.zrange('semaphore:key', 0, -1, 'WITHSCORES')
      // console.log(data)
      expect(data1).toEqual([])

      // lock was not refreshed by semaphore1, so semaphore2 can acquire the lock

      const semaphore2 = new MultiSemaphore(client, 'key', 3, 2, timeoutOptions)
      await semaphore2.acquire()
      const data2 = await client.zrange('semaphore:key', 0, -1, 'WITHSCORES')
      expect(data2).toContain(semaphore2.identifier + '_0')
      expect(data2).toContain(semaphore2.identifier + '_1')

      await Promise.all([semaphore1.release(), semaphore2.release()])
    }, 60000)
  })
  describe('ioredis-mock support', () => {
    it('should acquire and release semaphore', async () => {
      const semaphore1 = new MultiSemaphore(clientMock, 'key', 3, 2)
      const semaphore2 = new MultiSemaphore(clientMock, 'key', 3, 1)
      expect(semaphore1.isAcquired).toBe(false)
      expect(semaphore2.isAcquired).toBe(false)

      await semaphore1.acquire()
      expect(semaphore1.isAcquired).toBe(true)
      await semaphore2.acquire()
      expect(semaphore2.isAcquired).toBe(true)
      expectMembers(await clientMock.zrange('semaphore:key', 0, -1), [
        semaphore1.identifier + '_0',
        semaphore1.identifier + '_1',
        semaphore2.identifier + '_0'
      ])

      await semaphore1.release()
      expect(semaphore1.isAcquired).toBe(false)
      expect(await clientMock.zrange('semaphore:key', 0, -1)).toEqual([
        semaphore2.identifier + '_0'
      ])
      await semaphore2.release()
      expect(semaphore2.isAcquired).toBe(false)
      expect(await clientMock.zcard('semaphore:key')).toEqual(0)
    })
  })
})
