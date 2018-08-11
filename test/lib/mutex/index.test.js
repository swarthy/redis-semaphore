/* global expect client */

const { acquire, refresh, release } = require('../../../lib/mutex')

describe('mutex', () => {
  describe('acquire', () => {
    it('should return identifier on success acquire', async () => {
      const identifier = await acquire(client, 'key', 1000, 50, 10)
      expect(identifier).to.be.ok
      expect(await client.get('mutex:key')).to.be.eql(identifier)
    })
  })
  describe('refresh', () => {
    it('should refresh ttl', async () => {
      const identifier = await acquire(client, 'key', 1000)
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

