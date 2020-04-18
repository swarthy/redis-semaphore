import { expect } from 'chai'
import { Redis } from 'ioredis'

import { TimeoutOptions } from '../../src/misc'
import Semaphore from '../../src/RedisFairSemaphore'
import { delay } from '../../src/utils/index'
import client from '../redisClient'

const timeoutOptions: TimeoutOptions = {
  lockTimeout: 100,
  acquireTimeout: 100,
  refreshInterval: 80,
  retryInterval: 10
}

async function getRedisState(key = 'key') {
  return {
    key: await client.zrange(`semaphore:${key}`, 0, -1),
    counter: await client.get(`semaphore:${key}:counter`),
    owner: await client.zrange(`semaphore:${key}:owner`, 0, -1)
  }
}

describe('FairSemaphore', () => {
  it('should fail on invalid arguments', () => {
    expect(() => new Semaphore((null as unknown) as Redis, 'key', 5)).to.throw(
      '"client" is required'
    )
    expect(() => new Semaphore(({} as unknown) as Redis, 'key', 5)).to.throw(
      '"client" must be instance of ioredis client'
    )
    expect(() => new Semaphore(client, '', 5)).to.throw('"key" is required')
    expect(() => new Semaphore(client, (1 as unknown) as string, 5)).to.throw(
      '"key" must be a string'
    )
    expect(() => new Semaphore(client, 'key', 0)).to.throw(
      '"limit" is required'
    )
    expect(
      () => new Semaphore(client, 'key', ('10' as unknown) as number)
    ).to.throw('"limit" must be a number')
  })
  it('should acquire and release semaphore', async () => {
    const semaphore1 = new Semaphore(client, 'key', 2)
    const semaphore2 = new Semaphore(client, 'key', 2)
    const id1 = await semaphore1.acquire()
    const id2 = await semaphore2.acquire()
    expect((await getRedisState()).key).to.have.members([id1, id2])
    await semaphore1.release()
    expect((await getRedisState()).key).to.be.eql([id2])
    await semaphore2.release()
  })
  it('should refresh lock every refreshInterval ms until release', async () => {
    const semaphore1 = new Semaphore(client, 'key', 2, timeoutOptions)
    const semaphore2 = new Semaphore(client, 'key', 2, timeoutOptions)
    const semaphore3 = new Semaphore(client, 'key', 2, timeoutOptions)
    await semaphore1.acquire()
    await semaphore2.acquire()
    await delay(100)
    await expect(semaphore3.acquire()).to.be.rejectedWith(
      'Acquire semaphore key timeout'
    )
    await semaphore1.release()
    await semaphore3.acquire()
    await semaphore2.release()
    await semaphore3.release()
  })
  it('should NOT refresh lock if refreshInterval = 0', async () => {
    const noRefreshOptions = { ...timeoutOptions, refreshInterval: 0 }
    const semaphore1 = new Semaphore(client, 'key', 2, noRefreshOptions)
    const semaphore2 = new Semaphore(client, 'key', 2, noRefreshOptions)
    const semaphore3 = new Semaphore(client, 'key', 2, noRefreshOptions)
    const semaphore4 = new Semaphore(client, 'key', 2, noRefreshOptions)
    await semaphore1.acquire()
    await semaphore2.acquire()
    await delay(100)
    // semaphore1 and semaphore2 expired now
    await semaphore3.acquire()
    await semaphore4.acquire()
    await semaphore1.release()
    await semaphore2.release()
  })
  it('should reject with error if lock is lost between refreshes', async () => {
    const semaphore = new Semaphore(client, 'key', 2, timeoutOptions)
    let lostLockError
    function catchError(err: any) {
      lostLockError = err
    }
    process.on('unhandledRejection', catchError)
    await semaphore.acquire()
    await client.del('semaphore:key')
    await delay(100)
    expect(lostLockError).to.be.ok
    process.removeListener('unhandledRejection', catchError)
  })
  describe('reusable', () => {
    it('autorefresh enabled', async () => {
      const semaphore1 = new Semaphore(client, 'key', 2, timeoutOptions)
      const semaphore2 = new Semaphore(client, 'key', 2, timeoutOptions)

      await semaphore1.acquire()
      await semaphore2.acquire()
      await delay(100)
      await semaphore1.release()
      await semaphore2.release()

      await delay(100)

      await semaphore1.acquire()
      await semaphore2.acquire()
      await delay(100)
      await semaphore1.release()
      await semaphore2.release()

      await delay(100)

      await semaphore1.acquire()
      await semaphore2.acquire()
      await delay(100)
      await semaphore1.release()
      await semaphore2.release()
    })

    it('autorefresh disabled', async () => {
      const noRefreshOptions = {
        ...timeoutOptions,
        refreshInterval: 0,
        acquireTimeout: 10
      }
      const semaphore1 = new Semaphore(client, 'key', 2, noRefreshOptions)
      const semaphore2 = new Semaphore(client, 'key', 2, noRefreshOptions)
      const semaphore3 = new Semaphore(client, 'key', 2, noRefreshOptions)

      await semaphore1.acquire()
      await semaphore2.acquire()
      await delay(100)
      await semaphore1.release()
      await semaphore2.release()

      await delay(100)

      // [0/2]
      await semaphore1.acquire()
      // [1/2]
      await delay(80)
      await semaphore2.acquire()
      // [2/2]
      await expect(semaphore3.acquire()).to.be.rejectedWith(
        'Acquire semaphore key timeout'
      ) // rejectes after 10ms
      await delay(10)
      // [1/2]
      await semaphore3.acquire()
    })
  })
  it('should throw error on release not acquired semaphore', async () => {
    const semaphore = new Semaphore(client, 'key', 2, timeoutOptions)
    await expect(semaphore.release()).to.eventually.rejectedWith(
      'fair-semaphore key has no id'
    )
  })
  it('should throw timeout error if all resources is locked for acquireTimeout', async function () {
    const semaphore1 = new Semaphore(client, 'key', 2, timeoutOptions)
    const semaphore2 = new Semaphore(client, 'key', 2, timeoutOptions)
    const semaphore3 = new Semaphore(client, 'key', 2, timeoutOptions)
    await semaphore1.acquire()
    await semaphore2.acquire()
    await expect(semaphore3.acquire()).to.be.rejectedWith(
      'Acquire semaphore key timeout'
    )
    await semaphore1.release()
    await semaphore2.release()
  })
})
