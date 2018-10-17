/* global expect client */

const release = require('../../../lib/semaphore/release')

describe('semaphore release', () => {
  it('should return true for success release', async () => {
    await client.zadd('key', Date.now(), '111')
    expect(await client.zcard('key')).to.be.eql(1)
    const result = await release(client, 'key', '111')
    expect(result).to.be.true
    expect(await client.zcard('key')).to.be.eql(0)
  })
  it('should return false if resource is not locked', async () => {
    const result = await release(client, 'key', '111')
    expect(result).to.be.false
  })
})
