/* global expect client */

const refresh = require('../../../lib/mutex/refresh')

describe('mutex refresh', () => {
  it('should return false if resource is not acquired', async () => {
    const result = await refresh(client, 'key', '111', 10000)
    expect(result).to.be.false
  })
  it('should return true for success refresh', async () => {
    await client.set('key', '111')
    const result = await refresh(client, 'key', '111', 20000)
    expect(result).to.be.true
    expect(await client.pttl('key')).to.be.gte(10000)
  })
})
