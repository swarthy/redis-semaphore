/* global expect client */

const refresh = require('../../../lib/fair-semaphore/refresh')

describe('semaphore refresh', () => {
  it('should return false if resource is not acquired', async () => {
    const result = await refresh(client, 'key', 1, '111')
    expect(result).to.be.false
  })
  it('should return true for success refresh', async () => {
    const oldNow = Date.now() - 10000
    await client.zaddAsync('key', oldNow, '111')
    expect(await client.zrangeAsync('key', 0, -1)).to.be.eql(['111'])
    expect(await client.zcardAsync('key')).to.be.eql(1)
    const result = await refresh(client, 'key', '111')
    expect(await client.zrangeAsync('key', 0, -1)).to.be.eql(['111'])
    expect(await client.zcardAsync('key')).to.be.eql(1)
    expect(result).to.be.true
  })
})
