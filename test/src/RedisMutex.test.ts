import { expect } from 'chai'
import { Redis } from 'ioredis'

import { TimeoutOptions } from '../../src/misc'
import Mutex from '../../src/RedisMutex'
import { delay } from '../../src/utils/index'
import { client1 as client } from '../redisClient'

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
    await mutex.acquire()
    expect(await client.get('mutex:key')).to.be.eql(mutex.identifier)
    await mutex.release()
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
  it('should throw unhandled error if lock is lost between refreshes', async () => {
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
    await mutex.acquire()
    await delay(100)
    expect(await client.get('mutex:key')).to.be.eql(mutex.identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
    await delay(100)
    expect(await client.get('mutex:key')).to.be.eql(null)

    await delay(100)

    /* Lifecycle 2 */
    await mutex.acquire()
    await delay(100)
    expect(await client.get('mutex:key')).to.be.eql(mutex.identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
    await delay(100)
    expect(await client.get('mutex:key')).to.be.eql(null)

    await delay(100)

    /* Lifecycle 3 */
    await mutex.acquire()
    await delay(100)
    expect(await client.get('mutex:key')).to.be.eql(mutex.identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
    await delay(100)
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
})
