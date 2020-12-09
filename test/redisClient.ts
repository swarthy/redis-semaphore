import Redis from 'ioredis'

export const client1 = new Redis(
  process.env.REDIS_URI1 || 'redis://127.0.0.1:16379',
  { lazyConnect: true }
)
export const client2 = new Redis(
  process.env.REDIS_URI2 || 'redis://127.0.0.1:26379',
  { lazyConnect: true }
)
export const client3 = new Redis(
  process.env.REDIS_URI3 || 'redis://127.0.0.1:36379',
  { lazyConnect: true }
)

before(async () => {
  await client1.connect()
  await client2.connect()
  await client3.connect()
})

beforeEach(async () => {
  await client1.flushdb()
  await client2.flushdb()
  await client3.flushdb()
})

after(async () => {
  await client1.quit()
  await client2.quit()
  await client3.quit()
})
