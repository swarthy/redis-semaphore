/* global expect client */

const acquire = require('../../../lib/mutex/acquire')

describe('mutex acquire', () => {
  it('should return true for success lock', async () => {
    const result = await acquire(client, 'key', '111')
    expect(result).to.be.true
  })
  it('should return false when timeout', async () => {
    const result1 = await acquire(client, 'key', '111', 100, 50, 10)
    const result2 = await acquire(client, 'key', '111', 100, 50, 10)
    expect(result1).to.be.true
    expect(result2).to.be.false
  })
  it('should set identifier for key', async () => {
    await acquire(client, 'key1', '111', 100, 50, 10)
    const value = await client.get('key1')
    expect(value).to.be.eql('111')
  })
  it('should set TTL for key', async () => {
    await acquire(client, 'key2', '111', 1000, 50, 10)
    const ttl = await client.pttl('key2')
    expect(ttl).to.be.gte(990)
    expect(ttl).to.be.lte(1000)
  })
  it('should wait for auto-release', async () => {
    const start1 = Date.now()
    await acquire(client, 'key', '111', 100, 100, 10)
    const start2 = Date.now()
    await acquire(client, 'key', '222', 100, 100, 10)
    const now = Date.now()
    expect(start2 - start1).to.be.gte(0)
    expect(start2 - start1).to.be.lt(10)
    expect(now - start1).to.be.gte(100)
    expect(now - start2).to.be.gte(100)
  })
  it('should wait per key', async () => {
    const start1 = Date.now()
    await Promise.all([
      acquire(client, 'key1', 'a1', 100, 100, 10),
      acquire(client, 'key2', 'a2', 100, 100, 10)
    ])
    const start2 = Date.now()
    await Promise.all([
      acquire(client, 'key1', 'b1', 100, 100, 10),
      acquire(client, 'key2', 'b2', 100, 100, 10)
    ])
    const now = Date.now()
    expect(start2 - start1).to.be.gte(0)
    expect(start2 - start1).to.be.lt(10)
    expect(now - start1).to.be.gte(100)
    expect(now - start2).to.be.gte(100)
  })
})
