import { downRedisServer, upRedisServer } from './shell'

describe('TEST UTILS', () => {
  describe('shell', () => {
    it('should up redis server', async () => {
      await upRedisServer(1)
    })
    it('should down and up redis servers', async () => {
      await downRedisServer(1)
      await upRedisServer(1)
    })
  })
})
