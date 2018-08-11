/* global expect client */

const Mutex = require('../../lib/RedisMutex')
const Promise = require('bluebird')

describe('Mutex', () => {
  it('should acquire and release lock', async () => {
    const mutex = new Mutex(client, 'key')
    const identifier = await mutex.acquire()
    expect(await client.get('mutex:key')).to.be.eql(identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  it('should refresh lock every refreshInterval ms until release', async () => {
    const mutex = new Mutex(client, 'key', { lockTimeout: 30 })
    const identifier = await mutex.acquire()
    await Promise.delay(100)
    expect(await client.get('mutex:key')).to.be.eql(identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  it('should be reusable', async () => {
    const mutex = new Mutex(client, 'key', { lockTimeout: 20 })

    /* Lifecycle 1 */
    const identifier1 = await mutex.acquire()
    await Promise.delay(100)
    expect(await client.get('mutex:key')).to.be.eql(identifier1)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
    await Promise.delay(100)
    expect(await client.get('mutex:key')).to.be.eql(null)

    await Promise.delay(100)

    /* Lifecycle 2 */
    const identifier2 = await mutex.acquire()
    await Promise.delay(100)
    expect(await client.get('mutex:key')).to.be.eql(identifier2)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
    await Promise.delay(100)
    expect(await client.get('mutex:key')).to.be.eql(null)

    await Promise.delay(100)

    /* Lifecycle 3 */
    const identifier3 = await mutex.acquire()
    await Promise.delay(100)
    expect(await client.get('mutex:key')).to.be.eql(identifier3)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
    await Promise.delay(100)
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
})
