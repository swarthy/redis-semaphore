import Redis from 'ioredis'
import type RedisMockCtor from 'ioredis-mock'
import { once } from 'node:events'

function createClient(num: number) {
  const serverURL =
    process.env[`REDIS_URI${num}`] || `redis://127.0.0.1:${6000 + num}`
  const client = new Redis(serverURL, {
    connectionName: `client${num}`,
    lazyConnect: true,
    enableOfflineQueue: false,
    autoResendUnfulfilledCommands: false, // dont queue commands while server is offline (dont break test logic)
    maxRetriesPerRequest: 0, // dont retry, fail faster (default is 20)

    // https://github.com/luin/ioredis#auto-reconnect
    // retryStrategy is a function that will be called when the connection is lost.
    // The argument times means this is the nth reconnection being made and the return value represents how long (in ms) to wait to reconnect.
    retryStrategy() {
      return 100 // for tests we disable increasing timeout
    }
  })
  client.on('error', err => {
    console.log('Redis client error:', err.message)
  })
  return client
}

export const client1 = createClient(1)
export const client2 = createClient(2)
export const client3 = createClient(3)

export const allClients = [client1, client2, client3]

// ioredis-mock deep-imports ioredis' internals (e.g. `ioredis/built/Command`), which only
// exist in the ioredis 5/6 package layout. Under the ioredis-version CI matrix (ioredis@4)
// that import throws, so it's done dynamically and the "ioredis-mock support" describe
// blocks are skipped when it's unavailable, instead of failing every test file that imports
// this module.
export let ioredisMockAvailable = true
let RedisMock: typeof RedisMockCtor | undefined

try {
  RedisMock = (await import('ioredis-mock')).default
  await import('./ioredisMockCompat.js')
} catch {
  ioredisMockAvailable = false
}

function createClientMock(num: number) {
  return new RedisMock!(`redis://mock:${4200 + num}`, {
    connectionName: `client-mock${num}`,
    lazyConnect: true,
    enableOfflineQueue: false,
    autoResendUnfulfilledCommands: false, // dont queue commands while server is offline (dont break test logic)
    maxRetriesPerRequest: 0, // dont retry, fail faster (default is 20)

    // https://github.com/luin/ioredis#auto-reconnect
    // retryStrategy is a function that will be called when the connection is lost.
    // The argument times means this is the nth reconnection being made and the return value represents how long (in ms) to wait to reconnect.
    retryStrategy() {
      return 100 // for tests we disable increasing timeout
    }
  })
}

export const clientMock1 = ioredisMockAvailable ? createClientMock(1) : undefined
export const clientMock2 = ioredisMockAvailable ? createClientMock(2) : undefined
export const clientMock3 = ioredisMockAvailable ? createClientMock(3) : undefined

export const allClientMocks = [clientMock1, clientMock2, clientMock3].filter(
  c => c !== undefined
)

beforeAll(async () => {
  await Promise.all(allClients.map(c => c.connect()))
  await Promise.all(allClientMocks.map(c => c.connect()))
})

beforeEach(async () => {
  await Promise.all(
    allClients.map(c => {
      if (c.status !== 'ready') {
        console.warn(
          `client ${c.options.connectionName} status = ${c.status}. Wait for ready.`
        )
        return once(c, 'ready')
      }
      return null
    })
  )
  await Promise.all(allClients.map(c => c.flushdb()))
  await Promise.all(allClientMocks.map(c => c.flushdb()))
})

afterAll(async () => {
  await Promise.all(allClients.map(c => c.quit()))
  await Promise.all(allClientMocks.map(c => c.quit()))
  // allClients.forEach(c => c.disconnect())
})
