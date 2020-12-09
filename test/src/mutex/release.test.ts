import { expect } from 'chai'

import { releaseMutex as release } from '../../../src/mutex/release'
import { client1 as client } from '../../redisClient'

describe('Mutex release', () => {
  it('should remove key after release', async () => {
    await client.set('key', '111')
    await release(client, 'key', '111')
    expect(await client.get('key')).to.be.eql(null)
  })
  it('should do nothing if resource is not locked', async () => {
    expect(await client.get('key')).to.be.eql(null)
    await release(client, 'key', '111')
    expect(await client.get('key')).to.be.eql(null)
  })
})
