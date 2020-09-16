import { expect } from 'chai'

import { acquire, Options } from '../../../../src/semaphore/acquire/internal'
import client from '../../../redisClient'

const opts = (id: string, nowOffset = 0): Options => ({
  identifier: id,
  lockTimeout: 500,
  now: new Date().getTime() + nowOffset
})

describe('semaphore acquire internal', () => {
  it('should return 1 for success acquire', async () => {
    const result = await acquire(client, 'key', 1, opts('111'))
    expect(result).to.be.eql(1)
  })
  it('should return 0 for failure acquire', async () => {
    const result1 = await acquire(client, 'key', 1, opts('111'))
    const result2 = await acquire(client, 'key', 1, opts('112'))
    expect(result1).to.be.eql(1)
    expect(result2).to.be.eql(0)
  })
  describe('TIME SHIFT case', () => {
    it('should handle time difference less than lockTimeout (nodeA has faster clocks)', async () => {
      // lockTimeout = 500ms
      // nodeA is for 450ms faster than nodeB
      const resultA = await acquire(client, 'key', 1, opts('111', 450))
      const resultB = await acquire(client, 'key', 1, opts('112', 0))
      expect(resultA).to.be.eql(1)
      expect(resultB).to.be.eql(0)
    })
    it('should handle time difference less than lockTimeout (nodeA has slower clocks)', async () => {
      // lockTimeout = 500ms
      // nodeB is for 450ms faster than nodeA
      const resultA = await acquire(client, 'key', 1, opts('111', 0))
      const resultB = await acquire(client, 'key', 1, opts('112', 450))
      expect(resultA).to.be.eql(1)
      expect(resultB).to.be.eql(0)
    })
    it('cant handle time difference greater than lockTimeout (nodeA has slower clocks)', async () => {
      // lockTimeout = 500ms
      // nodeB is for 550ms faster than nodeA
      const resultA = await acquire(client, 'key', 1, opts('111', 0))
      const resultB = await acquire(client, 'key', 1, opts('112', 550))
      expect(resultA).to.be.eql(1)
      expect(resultB).to.be.eql(1) // Semaphore stealed...

      // This happens due removing "expired" nodeA lock (at nodeB "now" nodeA lock has been expired 50ms ago)
      // Unfortunatelly "fair" semaphore described here
      // https://redislabs.com/ebook/part-2-core-concepts/chapter-6-application-components-in-redis/6-3-counting-semaphores/6-3-1-building-a-basic-counting-semaphore/
      // also has the same problem
    })
  })
})
