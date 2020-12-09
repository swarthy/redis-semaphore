import { expect } from 'chai'

import { releaseSemaphore as release } from '../../../../src/multiSemaphore/release/index'
import { client1 as client } from '../../../redisClient'

describe('multiSemaphore release', () => {
  it('should remove key after success release', async () => {
    await client.zadd('key', '' + Date.now(), '111_0')
    expect(await client.zcard('key')).to.be.eql(1)
    await release(client, 'key', 1, '111')
    expect(await client.zcard('key')).to.be.eql(0)
  })
  it('should do nothing if resource is not locked', async () => {
    expect(await client.zcard('key')).to.be.eql(0)
    await release(client, 'key', 1, '111')
    expect(await client.zcard('key')).to.be.eql(0)
  })
})
