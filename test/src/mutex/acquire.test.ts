import { acquireMutex as acquire, Options } from '../../../src/mutex/acquire'
import { client1 as client } from '../../redisClient'

const opts = (id: string, overrides?: Partial<Options>): Options => ({
  identifier: id,
  acquireTimeout: 50,
  acquireAttemptsLimit: Number.POSITIVE_INFINITY,
  lockTimeout: 100,
  retryInterval: 10,
  ...overrides
})

describe('mutex acquire', () => {
  it('should return true for success lock', async () => {
    const result = await acquire(client, 'key', opts('111'))
    expect(result).toBe(true)
  })
  it('should return false when timeout', async () => {
    const result1 = await acquire(client, 'key', opts('111'))
    const result2 = await acquire(client, 'key', opts('222'))
    expect(result1).toBe(true)
    expect(result2).toBe(false)
  })
  it('should return false after acquireAttemptsLimit', async () => {
    const result1 = await acquire(client, 'key', opts('111'))
    const result2 = await acquire(
      client,
      'key',
      opts('222', {
        acquireAttemptsLimit: 1,
        acquireTimeout: Number.POSITIVE_INFINITY
      })
    )
    expect(result1).toBe(true)
    expect(result2).toBe(false)
  })
  it('should set identifier for key', async () => {
    await acquire(client, 'key1', opts('111'))
    const value = await client.get('key1')
    expect(value).toEqual('111')
  })
  it('should set TTL for key', async () => {
    await acquire(client, 'key2', opts('111'))
    const ttl = await client.pttl('key2')
    expect(ttl).toBeGreaterThanOrEqual(90)
    expect(ttl).toBeLessThanOrEqual(100)
  })
  it('should wait for auto-release', async () => {
    const start1 = Date.now()
    await acquire(client, 'key', opts('111'))
    const start2 = Date.now()
    await acquire(client, 'key', opts('222'))
    const now = Date.now()
    expect(start2 - start1).toBeGreaterThanOrEqual(0)
    expect(start2 - start1).toBeLessThan(10)
    expect(now - start1).toBeGreaterThanOrEqual(50)
    expect(now - start2).toBeGreaterThanOrEqual(50)
  })
  it('should wait per key', async () => {
    const start1 = Date.now()
    await Promise.all([
      acquire(client, 'key1', opts('a1')),
      acquire(client, 'key2', opts('a2'))
    ])
    const start2 = Date.now()
    await Promise.all([
      acquire(client, 'key1', opts('b1')),
      acquire(client, 'key2', opts('b2'))
    ])
    const now = Date.now()
    expect(start2 - start1).toBeGreaterThanOrEqual(0)
    expect(start2 - start1).toBeLessThan(10)
    expect(now - start1).toBeGreaterThanOrEqual(50)
    expect(now - start2).toBeGreaterThanOrEqual(50)
  })
})
