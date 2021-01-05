import { expect } from 'chai'

import { acquireLua } from '../../../../src/multiSemaphore/acquire/lua'
import { client1 as client } from '../../../redisClient'

interface Options {
  identifier: string
  lockTimeout: number
  now: number
}

const opts = (id: string, nowOffset = 0): Options => ({
  identifier: id,
  lockTimeout: 500,
  now: new Date().getTime() + nowOffset
})

async function acquire(options: Options) {
  const { identifier, lockTimeout, now } = options
  return await acquireLua(client, ['key', 1, 1, identifier, lockTimeout, now])
}

describe('multiSemaphore acquire internal', () => {
  it('should return 1 for success acquire', async () => {
    const result = await acquire(opts('111'))
    expect(result).to.be.eql(1)
    expect(await client.zrange('key', 0, -1)).to.be.eql(['111_0'])
  })
  it('should return 0 for failure acquire', async () => {
    const result1 = await acquire(opts('111'))
    const result2 = await acquire(opts('112'))
    expect(await client.zrange('key', 0, -1)).to.be.eql(['111_0'])
    expect(result1).to.be.eql(1)
    expect(result2).to.be.eql(0)
  })
  describe('TIME SHIFT case', () => {
    it('should handle time difference less than lockTimeout (nodeA has faster clocks)', async () => {
      // lockTimeout = 500ms
      // nodeA is for 450ms faster than nodeB
      const resultA = await acquire(opts('111', 450))
      const resultB = await acquire(opts('112', 0))
      expect(resultA).to.be.eql(1)
      expect(resultB).to.be.eql(0)
    })
    it('should handle time difference less than lockTimeout (nodeA has slower clocks)', async () => {
      // lockTimeout = 500ms
      // nodeB is for 450ms faster than nodeA
      const resultA = await acquire(opts('111', 0))
      const resultB = await acquire(opts('112', 450))
      expect(resultA).to.be.eql(1)
      expect(resultB).to.be.eql(0)
    })
    it('cant handle time difference greater than lockTimeout (nodeA has slower clocks)', async () => {
      // lockTimeout = 500ms
      // nodeB is for 550ms faster than nodeA
      const resultA = await acquire(opts('111', 0))
      const resultB = await acquire(opts('112', 550))
      expect(resultA).to.be.eql(1)
      expect(resultB).to.be.eql(1) // Semaphore stealed...

      // This happens due removing "expired" nodeA lock (at nodeB "now" nodeA lock has been expired 50ms ago)
      // Unfortunatelly "fair" semaphore described here
      // https://redislabs.com/ebook/part-2-core-concepts/chapter-6-application-components-in-redis/6-3-counting-semaphores/6-3-1-building-a-basic-counting-semaphore/
      // also has the same problem
    })
  })
})
