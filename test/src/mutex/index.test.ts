import { expect } from 'chai'

import { acquire, refresh, release } from '../../../src/mutex/index'
import client from '../../redisClient'

describe('mutex', () => {
  describe('acquire', () => {
    it('should return identifier on success acquire', async () => {
      const identifier = await acquire(client, 'key', 1000, 50, 10)
      expect(identifier).to.be.ok
      expect(await client.get('mutex:key')).to.be.eql(identifier)
    })
    it('should reject error after timeout', async () => {
      await acquire(client, 'key', 1000, 50, 10)
      await expect(acquire(client, 'key', 1000, 50, 10)).to.be.rejectedWith(
        /Acquire mutex key timeout/
      )
    })
  })
  describe('refresh', () => {
    it('should refresh ttl', async () => {
      const identifier = await acquire(client, 'key', 1000, 1000, 10)
      expect(identifier).to.be.ok
      expect(await client.get('mutex:key')).to.be.eql(identifier)
      await refresh(client, 'key', identifier, 3000)
      expect(await client.pttl('mutex:key')).to.be.gt(1000)
    })
  })
  describe('release', () => {
    it('should release acquired resource', async () => {
      const identifier = await acquire(client, 'key', 1000, 50, 10)
      expect(await client.get('mutex:key')).to.be.eql(identifier)
      await release(client, 'key', identifier)
      expect(await client.get('mutex:key')).to.be.eql(null)
    })
  })
})
