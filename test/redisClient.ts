import Redis from 'ioredis'

const URL = process.env.REDIS_URI || 'redis://127.0.0.1:6379'

const client = new Redis(URL, { lazyConnect: true })

before(async () => {
  await client.connect()
})

beforeEach(async () => {
  await client.flushdb()
})

after(async () => {
  await client.quit()
})

export default client
