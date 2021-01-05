import { expect } from 'chai'

import { acquireRedlockMutex as acquire, Options } from '../../../src/redlockMutex/acquire'
import { allClients } from '../../redisClient'

const opts = (id: string): Options => ({
  identifier: id,
  lockTimeout: 100,
  acquireTimeout: 100,
  retryInterval: 10
})

describe('redlockMutex acquire', () => {
  it('should return true for success lock', async () => {
    const result = await acquire(allClients, 'key', opts('111'))
    expect(result).to.be.true
  })
  it('should return false when timeout', async () => {
    const result1 = await acquire(allClients, 'key', opts('111'))
    const result2 = await acquire(allClients, 'key', opts('222'))
    expect(result1).to.be.true
    expect(result2).to.be.false
  })
  it('should set identifier for key', async () => {
    await acquire(allClients, 'key1', opts('111'))
    const values = await Promise.all(
      allClients.map(client => client.get('key1'))
    )
    expect(values).to.be.eql(['111', '111', '111'])
  })
  it('should set TTL for key', async () => {
    await acquire(allClients, 'key2', opts('111'))
    const ttls = await Promise.all(
      allClients.map(client => client.pttl('key2'))
    )
    for (const ttl of ttls) {
      if (ttl === -2) {
        continue
      }
      expect(ttl).to.be.gte(90)
      expect(ttl).to.be.lte(100)
    }
  })
  it('should wait for auto-release', async () => {
    const start1 = Date.now()
    await acquire(allClients, 'key', opts('111'))
    const start2 = Date.now()
    await acquire(allClients, 'key', opts('222'))
    const now = Date.now()
    expect(start2 - start1).to.be.gte(0)
    expect(start2 - start1).to.be.lt(10)
    expect(now - start1).to.be.gte(100)
    expect(now - start2).to.be.gte(100)
  })
  it('should wait per key', async () => {
    const start1 = Date.now()
    await Promise.all([
      acquire(allClients, 'key1', opts('a1')),
      acquire(allClients, 'key2', opts('a2'))
    ])
    const start2 = Date.now()
    await Promise.all([
      acquire(allClients, 'key1', opts('b1')),
      acquire(allClients, 'key2', opts('b2'))
    ])
    const now = Date.now()
    expect(start2 - start1).to.be.gte(0)
    expect(start2 - start1).to.be.lt(10)
    expect(now - start1).to.be.gte(100)
    expect(now - start2).to.be.gte(100)
  })
})
