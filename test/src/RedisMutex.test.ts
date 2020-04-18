import { expect } from 'chai'
import { Redis } from 'ioredis'

import { TimeoutOptions } from '../../src/misc'
import Mutex from '../../src/RedisMutex'
import { delay } from '../../src/utils/index'
import client from '../redisClient'

const timeoutOptions: TimeoutOptions = {
  lockTimeout: 100,
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
    const identifier = await mutex.acquire()
    expect(await client.get('mutex:key')).to.be.eql(identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  it('should refresh lock every refreshInterval ms until release', async () => {
    const mutex = new Mutex(client, 'key', timeoutOptions)
    const identifier = await mutex.acquire()
    await delay(100)
    expect(await client.get('mutex:key')).to.be.eql(identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  it('should reject with error if lock is lost between refreshes', async () => {
    const mutex = new Mutex(client, 'key', timeoutOptions)
    let lostLockError: any
    function catchError(err: any) {
      lostLockError = err
    }
    process.on('unhandledRejection', catchError)
    await mutex.acquire()
    await client.del('mutex:key')
    await delay(100)
    expect(lostLockError).to.be.ok
    process.removeListener('unhandledRejection', catchError)
  })
  it('should be reusable', async () => {
    const mutex = new Mutex(client, 'key', timeoutOptions)

    /* Lifecycle 1 */
    const identifier1 = await mutex.acquire()
    await delay(100)
    expect(await client.get('mutex:key')).to.be.eql(identifier1)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
    await delay(100)
    expect(await client.get('mutex:key')).to.be.eql(null)

    await delay(100)

    /* Lifecycle 2 */
    const identifier2 = await mutex.acquire()
    await delay(100)
    expect(await client.get('mutex:key')).to.be.eql(identifier2)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
    await delay(100)
    expect(await client.get('mutex:key')).to.be.eql(null)

    await delay(100)

    /* Lifecycle 3 */
    const identifier3 = await mutex.acquire()
    await delay(100)
    expect(await client.get('mutex:key')).to.be.eql(identifier3)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
    await delay(100)
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  it('should throw error on release not acquired mutex', async () => {
    const mutex = new Mutex(client, 'key', timeoutOptions)
    await expect(mutex.release()).to.be.rejectedWith(
      'mutex key has no identifier'
    )
  })
})
