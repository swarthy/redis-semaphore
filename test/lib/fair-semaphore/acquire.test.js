/* global expect client */

const acquire = require('../../../lib/fair-semaphore/acquire')

describe('semaphore acquire', () => {
  it('should return true for success acquire', async () => {
    const result = await acquire(client, 'key', 1, '111', 100, 50, 10)
    expect(result).to.be.true
  })
  it('should return false when timeout', async () => {
    const result1 = await acquire(client, 'key', 2, '111', 100, 50, 10)
    const result2 = await acquire(client, 'key', 2, '112', 100, 50, 10)
    const result3 = await acquire(client, 'key', 2, '113', 100, 50, 10)
    expect(result1).to.be.true
    expect(result2).to.be.true
    expect(result3).to.be.false
  })
})
