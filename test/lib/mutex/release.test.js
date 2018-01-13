/* global expect client */

const release = require('../../../lib/mutex/release')

describe('Mutex release', () => {
  it('should return true for success release', async () => {
    await client.setAsync('key', '111')
    const result = await release(client, 'key', '111')
    expect(result).to.be.true
    expect(await client.getAsync('key')).to.be.eql(null)
  })
  it('should return false if resource is not locked', async () => {
    const result = await release(client, 'key', '111')
    expect(result).to.be.false
  })
})
