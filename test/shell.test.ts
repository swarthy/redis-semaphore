import { downRedisServer, upRedisServer } from './shell'

describe('TEST UTILS', () => {
  describe('shell', () => {
    it('should up redis server', async function () {
      this.timeout(30000)
      await upRedisServer(1)
    })
    it('should down and up redis servers', async function () {
      this.timeout(30000)
      await downRedisServer(1)
      await upRedisServer(1)
    })
  })
})
