/* global expect client */

const { lock, unlock } = require('../../../lib/mutex')

describe('Mutex', () => {
  describe('lock', () => {
    it('should return identifier on success lock', async () => {
      const identifier = await lock(client, 'key')
      expect(identifier).to.be.ok
      expect(await client.getAsync('mutex:key')).to.be.eql(identifier)
    })
  })
  describe('unlock', () => {
    it('should unlock locked resourse', async () => {
      const identifier = await lock(client, 'key')
      expect(await client.getAsync('mutex:key')).to.be.eql(identifier)
      await unlock(client, 'key', identifier)
      expect(await client.getAsync('mutex:key')).to.be.eql(null)
    })
  })
})

