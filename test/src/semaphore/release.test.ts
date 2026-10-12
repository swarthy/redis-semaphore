import { releaseSemaphore as release } from '../../../src/semaphore/release'
import { client1 as client } from '../../redisClient'

describe('semaphore release', () => {
  it('should remove key after success release', async () => {
    await client.zadd('key', '' + Date.now(), '111')
    expect(await client.zcard('key')).toEqual(1)
    await release(client, 'key', '111')
    expect(await client.zcard('key')).toEqual(0)
  })
  it('should do nothing if resource is not locked', async () => {
    expect(await client.zcard('key')).toEqual(0)
    await release(client, 'key', '111')
    expect(await client.zcard('key')).toEqual(0)
  })
})
