/* global expect client */

const Semaphore = require('../../lib/RedisSemaphore')
const Promise = require('bluebird')

describe('Semaphore', () => {
  it('should acquire and release semaphore', async () => {
    const semaphore1 = new Semaphore(client, 'key', 2)
    const semaphore2 = new Semaphore(client, 'key', 2)
    const identifier1 = await semaphore1.acquire()
    const identifier2 = await semaphore2.acquire()
    expect(await client.zrange('semaphore:key', 0, -1)).to.have.members([
      identifier1,
      identifier2
    ])
    await semaphore1.release()
    expect(await client.zrange('semaphore:key', 0, -1)).to.be.eql([
      identifier2
    ])
    await semaphore2.release()
    expect(await client.zcard('semaphore:key')).to.be.eql(0)
  })
  it('should refresh lock every refreshInterval ms until release', async () => {
    const semaphore1 = new Semaphore(client, 'key', 2, { lockTimeout: 30 })
    const semaphore2 = new Semaphore(client, 'key', 2, { lockTimeout: 30 })
    const identifier1 = await semaphore1.acquire()
    const identifier2 = await semaphore2.acquire()
    await Promise.delay(100)
    expect(await client.zrange('semaphore:key', 0, -1)).to.have.members([
      identifier1,
      identifier2
    ])
    await semaphore1.release()
    expect(await client.zrange('semaphore:key', 0, -1)).to.be.eql([
      identifier2
    ])
    await semaphore2.release()
    expect(await client.zcard('semaphore:key')).to.be.eql(0)
  })
  it('should be reusable', async () => {
    const semaphore1 = new Semaphore(client, 'key', 2, { lockTimeout: 20 })
    const semaphore2 = new Semaphore(client, 'key', 2, { lockTimeout: 20 })

    /* Lifecycle 1 */
    const identifier11 = await semaphore1.acquire()
    const identifier12 = await semaphore2.acquire()
    await Promise.delay(100)
    expect(await client.zrange('semaphore:key', 0, -1)).to.have.members([
      identifier11,
      identifier12
    ])
    await semaphore1.release()
    await semaphore2.release()
    expect(await client.zrange('semaphore:key', 0, -1)).to.be.eql([])
    await Promise.delay(100)
    expect(await client.zrange('semaphore:key', 0, -1)).to.be.eql([])

    await Promise.delay(100)

    /* Lifecycle 2 */
    const identifier21 = await semaphore1.acquire()
    const identifier22 = await semaphore2.acquire()
    await Promise.delay(100)
    expect(await client.zrange('semaphore:key', 0, -1)).to.have.members([
      identifier21,
      identifier22
    ])
    await semaphore1.release()
    await semaphore2.release()
    expect(await client.zrange('semaphore:key', 0, -1)).to.be.eql([])
    await Promise.delay(100)
    expect(await client.zrange('semaphore:key', 0, -1)).to.be.eql([])

    await Promise.delay(100)

    /* Lifecycle 3 */
    const identifier31 = await semaphore1.acquire()
    const identifier32 = await semaphore2.acquire()
    await Promise.delay(100)
    expect(await client.zrange('semaphore:key', 0, -1)).to.have.members([
      identifier31,
      identifier32
    ])
    await semaphore1.release()
    await semaphore2.release()
    expect(await client.zrange('semaphore:key', 0, -1)).to.be.eql([])
    await Promise.delay(100)
    expect(await client.zrange('semaphore:key', 0, -1)).to.be.eql([])
  })
})
