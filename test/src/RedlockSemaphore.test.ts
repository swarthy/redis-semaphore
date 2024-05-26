import { expect } from 'chai'
import { Redis } from 'ioredis'
import sinon from 'sinon'
import LostLockError from '../../src/errors/LostLockError'
import RedlockSemaphore from '../../src/RedlockSemaphore'
import { TimeoutOptions } from '../../src/types'
import { delay } from '../../src/utils/index'
import {
  allClientMocks,
  allClients,
  client1,
  client2,
  client3
} from '../redisClient'
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

async function expectZRangeAllEql(key: string, values: string[]) {
  const results = await Promise.all([
    client1.zrange(key, 0, -1),
    client2.zrange(key, 0, -1),
    client3.zrange(key, 0, -1)
  ])
  expect(results).to.be.eql([values, values, values])
}

async function expectZRangeAllHaveMembers(key: string, values: string[]) {
  const results = await Promise.all([
    client1.zrange(key, 0, -1),
    client2.zrange(key, 0, -1),
    client3.zrange(key, 0, -1)
  ])
  for (const result of results) {
    expect(result).to.have.members(values)
  }
}

async function expectZCardAllEql(key: string, count: number) {
  const results = await Promise.all([
    client1.zcard(key),
    client2.zcard(key),
    client3.zcard(key)
  ])
  expect(results).to.be.eql([count, count, count])
}

describe('RedlockSemaphore', () => {
  it('should fail on invalid arguments', () => {
    expect(
      () => new RedlockSemaphore(null as unknown as Redis[], 'key', 5)
    ).to.throw('"clients" array is required')
    expect(() => new RedlockSemaphore(allClients, '', 5)).to.throw(
      '"key" is required'
    )
    expect(
      () => new RedlockSemaphore(allClients, 1 as unknown as string, 5)
    ).to.throw('"key" must be a string')
    expect(() => new RedlockSemaphore(allClients, 'key', 0)).to.throw(
      '"limit" is required'
    )
    expect(
      () => new RedlockSemaphore(allClients, 'key', '10' as unknown as number)
    ).to.throw('"limit" must be a number')
  })
  it('should acquire and release semaphore', async () => {
    const semaphore1 = new RedlockSemaphore(allClients, 'key', 2)
    const semaphore2 = new RedlockSemaphore(allClients, 'key', 2)
    await semaphore1.acquire()
    await semaphore2.acquire()
    await expectZRangeAllHaveMembers('semaphore:key', [
      semaphore1.identifier,
      semaphore2.identifier
    ])
    await semaphore1.release()
    await expectZRangeAllEql('semaphore:key', [semaphore2.identifier])
    await semaphore2.release()
    await expectZCardAllEql('semaphore:key', 0)
  })
  it('should reject after timeout', async () => {
    const semaphore1 = new RedlockSemaphore(
      allClients,
      'key',
      1,
      timeoutOptions
    )
    const semaphore2 = new RedlockSemaphore(
      allClients,
      'key',
      1,
      timeoutOptions
    )
    await semaphore1.acquire()
    await expect(semaphore2.acquire()).to.be.rejectedWith(
      'Acquire redlock-semaphore semaphore:key timeout'
    )
    await semaphore1.release()
    await expectZCardAllEql('semaphore:key', 0)
  })
  it('should refresh lock every refreshInterval ms until release', async () => {
    const semaphore1 = new RedlockSemaphore(
      allClients,
      'key',
      2,
      timeoutOptions
    )
    const semaphore2 = new RedlockSemaphore(
      allClients,
      'key',
      2,
      timeoutOptions
    )
    await semaphore1.acquire()
    await semaphore2.acquire()
    await delay(400)
    await expectZRangeAllHaveMembers('semaphore:key', [
      semaphore1.identifier,
      semaphore2.identifier
    ])
    await semaphore1.release()
    await expectZRangeAllEql('semaphore:key', [semaphore2.identifier])
    await semaphore2.release()
    await expectZCardAllEql('semaphore:key', 0)
  })
  it('should stop refreshing lock if stopped', async () => {
    const semaphore1 = new RedlockSemaphore(
      allClients,
      'key',
      2,
      timeoutOptions
    )
    const semaphore2 = new RedlockSemaphore(
      allClients,
      'key',
      2,
      timeoutOptions
    )
    await semaphore1.acquire()
    await semaphore2.acquire()
    semaphore1.stopRefresh()
    await delay(400)
    await expectZRangeAllEql('semaphore:key', [semaphore2.identifier])
    semaphore2.stopRefresh()
    await delay(400)
    await expectZCardAllEql('semaphore:key', 0)
  })
  it('should acquire maximum LIMIT semaphores', async () => {
    const s = () =>
      new RedlockSemaphore(allClients, 'key', 3, {
        acquireTimeout: 1000,
        lockTimeout: 50,
        retryInterval: 10,
        refreshInterval: 0 // disable refresh
      })
    const set1 = [s(), s(), s()]
    const pr1 = Promise.all(set1.map(sem => sem.acquire()))
    await delay(5)
    const set2 = [s(), s(), s()]
    const pr2 = Promise.all(set2.map(sem => sem.acquire()))
    await pr1
    await expectZRangeAllHaveMembers('semaphore:key', [
      set1[0].identifier,
      set1[1].identifier,
      set1[2].identifier
    ])
    await expectZCardAllEql('semaphore:key', 3)
    await pr2
    await expectZRangeAllHaveMembers('semaphore:key', [
      set2[0].identifier,
      set2[1].identifier,
      set2[2].identifier
    ])
    await expectZCardAllEql('semaphore:key', 3)
  })
  it('should support externally acquired semaphore (deprecated interface)', async () => {
    const externalSemaphore = new RedlockSemaphore(allClients, 'key', 3, {
      ...timeoutOptions,
      refreshInterval: 0
    })
    const localSemaphore = new RedlockSemaphore(allClients, 'key', 3, {
      ...timeoutOptions,
      externallyAcquiredIdentifier: externalSemaphore.identifier
    })
    await externalSemaphore.acquire()
    await localSemaphore.acquire()
    await delay(400)
    await expectZRangeAllEql('semaphore:key', [localSemaphore.identifier])
    await localSemaphore.release()
    await expectZCardAllEql('semaphore:key', 0)
  })
  it('should support externally acquired semaphore', async () => {
    const externalSemaphore = new RedlockSemaphore(allClients, 'key', 3, {
      ...timeoutOptions,
      refreshInterval: 0
    })
    const localSemaphore = new RedlockSemaphore(allClients, 'key', 3, {
      ...timeoutOptions,
      identifier: externalSemaphore.identifier,
      acquiredExternally: true
    })
    await externalSemaphore.acquire()
    await localSemaphore.acquire()
    await delay(400)
    await expectZRangeAllEql('semaphore:key', [localSemaphore.identifier])
    await localSemaphore.release()
    await expectZCardAllEql('semaphore:key', 0)
  })
  describe('lost lock case', () => {
    beforeEach(() => {
      catchUnhandledRejection()
    })
    afterEach(() => {
      throwUnhandledRejection()
    })
    it('should throw unhandled error if lock is lost between refreshes', async () => {
      const semaphore = new RedlockSemaphore(
        allClients,
        'key',
        3,
        timeoutOptions
      )
      await semaphore.acquire()
      await Promise.all(allClients.map(client => client.del('semaphore:key')))
      await Promise.all(
        allClients.map(client =>
          client.zadd(
            'semaphore:key',
            Date.now(),
            'aaa',
            Date.now(),
            'bbb',
            Date.now(),
            'ccc'
          )
        )
      )
      await delay(200)
      expect(unhandledRejectionSpy).to.be.called
      expect(unhandledRejectionSpy.firstCall.firstArg instanceof LostLockError)
        .to.be.true
    })
    it('should call onLockLost callback if provided', async () => {
      const onLockLostCallback = sinon.spy(function (this: RedlockSemaphore) {
        expect(this.isAcquired).to.be.false
      })
      const semaphore = new RedlockSemaphore(allClients, 'key', 3, {
        ...timeoutOptions,
        onLockLost: onLockLostCallback
      })
      await semaphore.acquire()
      expect(semaphore.isAcquired).to.be.true
      await Promise.all(allClients.map(client => client.del('semaphore:key')))
      await Promise.all(
        allClients.map(client =>
          client.zadd(
            'semaphore:key',
            Date.now(),
            'aaa',
            Date.now(),
            'bbb',
            Date.now(),
            'ccc'
          )
        )
      )
      await delay(200)
      expect(semaphore.isAcquired).to.be.false
      expect(unhandledRejectionSpy).to.not.called
      expect(onLockLostCallback).to.be.called
      expect(onLockLostCallback.firstCall.firstArg instanceof LostLockError).to
        .be.true
    })
  })
  describe('reusable', () => {
    it('autorefresh enabled', async () => {
      const semaphore1 = new RedlockSemaphore(
        allClients,
        'key',
        2,
        timeoutOptions
      )
      const semaphore2 = new RedlockSemaphore(
        allClients,
        'key',
        2,
        timeoutOptions
      )

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
      const semaphore1 = new RedlockSemaphore(
        allClients,
        'key',
        2,
        noRefreshOptions
      )
      const semaphore2 = new RedlockSemaphore(
        allClients,
        'key',
        2,
        noRefreshOptions
      )
      const semaphore3 = new RedlockSemaphore(
        allClients,
        'key',
        2,
        noRefreshOptions
      )

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
        'Acquire redlock-semaphore semaphore:key timeout'
      ) // rejectes after 10ms

      // since semaphore1.acquire() elapsed 80ms (delay) + 10ms (semaphore3 timeout)
      // semaphore1 will expire after 300 - 90 = 210ms
      await delay(210)

      // [1/2]
      await semaphore3.acquire()
    })
  })
  describe('[Node shutdown]', () => {
    afterEach(async () => {
      await Promise.all([upRedisServer(1), upRedisServer(2), upRedisServer(3)])
    })
    it('should handle server shutdown if quorum is alive', async function () {
      this.timeout(60000)
      const semaphore11 = new RedlockSemaphore(
        allClients,
        'key',
        3,
        timeoutOptions
      )
      const semaphore12 = new RedlockSemaphore(
        allClients,
        'key',
        3,
        timeoutOptions
      )
      const semaphore13 = new RedlockSemaphore(
        allClients,
        'key',
        3,
        timeoutOptions
      )
      await Promise.all([
        semaphore11.acquire(),
        semaphore12.acquire(),
        semaphore13.acquire()
      ])

      // <Server1Failure>
      await downRedisServer(1)
      console.log('SHUT DOWN 1')

      await delay(1000)

      // lock survive in server2 and server3
      // semaphore2 will NOT be able to acquire the lock

      const semaphore2 = new RedlockSemaphore(
        allClients,
        'key',
        3,
        timeoutOptions
      )
      await expect(semaphore2.acquire()).to.be.rejectedWith(
        'Acquire redlock-semaphore semaphore:key timeout'
      )

      // key in server1 has expired now

      await upRedisServer(1)
      console.log('ONLINE 1')

      // let semaphore1[1-3] to refresh lock on server1
      await delay(1000)
      expect(await client1.zrange('semaphore:key', 0, -1)).to.have.members([
        semaphore11.identifier,
        semaphore12.identifier,
        semaphore13.identifier
      ])
      // </Server1Failure>

      // <Server2Failure>
      await downRedisServer(2)
      console.log('SHUT DOWN 2')

      await delay(1000)

      // lock survive in server1 and server3
      // semaphore3 will NOT be able to acquire the lock

      const semaphore3 = new RedlockSemaphore(
        allClients,
        'key',
        3,
        timeoutOptions
      )
      await expect(semaphore3.acquire()).to.be.rejectedWith(
        'Acquire redlock-semaphore semaphore:key timeout'
      )

      // key in server2 has expired now

      await upRedisServer(2)
      console.log('ONLINE 2')

      // let semaphore1[1-3] to refresh lock on server1
      await delay(1000)
      expect(await client2.zrange('semaphore:key', 0, -1)).to.have.members([
        semaphore11.identifier,
        semaphore12.identifier,
        semaphore13.identifier
      ])
      // </Server2Failure>

      // <Server3Failure>
      await downRedisServer(3)
      console.log('SHUT DOWN 3')

      await delay(1000)

      // lock survive in server1 and server2
      // semaphore4 will NOT be able to acquire the lock

      const semaphore4 = new RedlockSemaphore(
        allClients,
        'key',
        3,
        timeoutOptions
      )
      await expect(semaphore4.acquire()).to.be.rejectedWith(
        'Acquire redlock-semaphore semaphore:key timeout'
      )

      // key in server1 has expired now

      await upRedisServer(3)
      console.log('ONLINE 3')

      // let semaphore1[1-3] to refresh lock on server1
      await delay(1000)
      expect(await client3.zrange('semaphore:key', 0, -1)).to.have.members([
        semaphore11.identifier,
        semaphore12.identifier,
        semaphore13.identifier
      ])
      // </Server3Failure>

      await Promise.all([
        semaphore11.release(),
        semaphore12.release(),
        semaphore13.release()
      ])
    })
    it('should fail and release when quorum become dead', async function () {
      this.timeout(60000)
      const onLockLostCallbacks = [1, 2, 3].map(() =>
        sinon.spy(function (this: RedlockSemaphore) {
          expect(this.isAcquired).to.be.false
        })
      )
      const semaphores1 = [1, 2, 3].map(
        (n, i) =>
          new RedlockSemaphore(allClients, 'key', 3, {
            ...timeoutOptions,
            onLockLost: onLockLostCallbacks[i]
          })
      )
      await Promise.all(semaphores1.map(s => s.acquire()))

      expect(await client1.zrange('semaphore:key', 0, -1)).to.have.members([
        semaphores1[0].identifier,
        semaphores1[1].identifier,
        semaphores1[2].identifier
      ])
      expect(await client2.zrange('semaphore:key', 0, -1)).to.have.members([
        semaphores1[0].identifier,
        semaphores1[1].identifier,
        semaphores1[2].identifier
      ])
      expect(await client3.zrange('semaphore:key', 0, -1)).to.have.members([
        semaphores1[0].identifier,
        semaphores1[1].identifier,
        semaphores1[2].identifier
      ])

      await downRedisServer(1)
      console.log('SHUT DOWN 1')

      await downRedisServer(2)
      console.log('SHUT DOWN 2')

      await delay(1000)

      for (const lostCb of onLockLostCallbacks) {
        expect(lostCb).to.be.called
        expect(lostCb.firstCall.firstArg instanceof LostLockError).to.be.true
      }

      // released lock on server3
      expect(await client3.zrange('semaphore:key', 0, -1)).to.be.eql([])

      // semaphore2 will NOT be able to acquire the lock

      const semaphore2 = new RedlockSemaphore(
        allClients,
        'key',
        3,
        timeoutOptions
      )
      await expect(semaphore2.acquire()).to.be.rejectedWith(
        'Acquire redlock-semaphore semaphore:key timeout'
      )
    })
  })
  describe('ioredis-mock support', () => {
    it('should acquire and release semaphore', async () => {
      const semaphore1 = new RedlockSemaphore(allClientMocks, 'key', 2)
      const semaphore2 = new RedlockSemaphore(allClientMocks, 'key', 2)
      await semaphore1.acquire()
      await semaphore2.acquire()
      await semaphore1.release()
      await semaphore2.release()
    })
  })
})
