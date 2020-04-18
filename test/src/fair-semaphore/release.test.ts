import { expect } from 'chai'

import release from '../../../src/fair-semaphore/release'
import client from '../../redisClient'

describe('fair-semaphore release', () => {
  it('should remove member after release', async () => {
    await client.zadd('key', '' + Date.now(), '111')
    expect(await client.zcard('key')).to.be.eql(1)
    await release(client, 'key', '111')
    expect(await client.zcard('key')).to.be.eql(0)
  })
  it('should do nothing if resource is not locked', async () => {
    expect(await client.zcard('key')).to.be.eql(0)
    await release(client, 'key', '111')
    expect(await client.zcard('key')).to.be.eql(0)
  })
})
