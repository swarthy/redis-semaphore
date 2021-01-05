import { expect } from 'chai'

import { releaseRedlockMutex as release } from '../../../src/redlockMutex/release'
import { allClients, client1 } from '../../redisClient'

describe('redlockMutex release', () => {
  it('should remove key after release', async () => {
    await client1.set('key', '111')
    await release(allClients, 'key', '111')
    expect(await client1.get('key')).to.be.eql(null)
  })
  it('should do nothing if resource is not locked', async () => {
    expect(await client1.get('key')).to.be.eql(null)
    await release(allClients, 'key', '111')
    expect(await client1.get('key')).to.be.eql(null)
  })
})
