/* global expect client */

const Mutex = require('../../lib/RedisMutex')
const Bluebird = require('bluebird')

describe('Mutex', () => {
  it('should acquire and release lock', async () => {
    const mutex = new Mutex(client, 'key')
    const identifier = await mutex.acquire()
    expect(await client.get('mutex:key')).to.be.eql(identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  it('should refresh lock every refreshInterval ms until release', async () => {
    const mutex = new Mutex(client, 'key', { lockTimeout: 100 })
    const identifier = await mutex.acquire()
    await Bluebird.delay(100)
    expect(await client.get('mutex:key')).to.be.eql(identifier)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
  it('should reject with error if lock is lost between refreshes', async () => {
    const mutex = new Mutex(client, 'key', { lockTimeout: 100 })
    let lostLockError
    function catchError(err) {
      lostLockError = err
    }
    process.on('unhandledRejection', catchError)
    await mutex.acquire()
    await client.del('mutex:key')
    await Bluebird.delay(100)
    expect(lostLockError).to.be.ok
    process.removeListener('unhandledRejection', catchError)
  })
  it('should be reusable', async () => {
    const mutex = new Mutex(client, 'key', { lockTimeout: 100 })

    /* Lifecycle 1 */
    const identifier1 = await mutex.acquire()
    await Bluebird.delay(100)
    expect(await client.get('mutex:key')).to.be.eql(identifier1)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
    await Bluebird.delay(100)
    expect(await client.get('mutex:key')).to.be.eql(null)

    await Bluebird.delay(100)

    /* Lifecycle 2 */
    const identifier2 = await mutex.acquire()
    await Bluebird.delay(100)
    expect(await client.get('mutex:key')).to.be.eql(identifier2)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
    await Bluebird.delay(100)
    expect(await client.get('mutex:key')).to.be.eql(null)

    await Bluebird.delay(100)

    /* Lifecycle 3 */
    const identifier3 = await mutex.acquire()
    await Bluebird.delay(100)
    expect(await client.get('mutex:key')).to.be.eql(identifier3)
    await mutex.release()
    expect(await client.get('mutex:key')).to.be.eql(null)
    await Bluebird.delay(100)
    expect(await client.get('mutex:key')).to.be.eql(null)
  })
})
