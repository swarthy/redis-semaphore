import { refreshRedlockMutex as refresh } from '../../../src/redlockMutex/refresh'
import { allClients, client1, client2, client3 } from '../../redisClient'

describe('redlockMutex refresh', () => {
  it('should return false if resource is acquired by different instance on quorum', async () => {
    await client1.set('key', '111')
    await client2.set('key', '222')
    await client3.set('key', '222')
    const result = await refresh(allClients, 'key', '111', 10000)
    expect(result).toBe(false)
  })
  it('should return true if resource is acquired on quorum', async () => {
    await client1.set('key', '111')
    await client2.set('key', '111')
    const result = await refresh(allClients, 'key', '111', 20000)
    expect(result).toBe(true)
    expect(await client1.pttl('key')).toBeGreaterThanOrEqual(10000)
    expect(await client2.pttl('key')).toBeGreaterThanOrEqual(10000)
  })
  it('should return false if resource is not acquired on quorum', async () => {
    await client1.set('key', '111')
    const result = await refresh(allClients, 'key', '111', 10000)
    expect(result).toBe(false)
  })
})
