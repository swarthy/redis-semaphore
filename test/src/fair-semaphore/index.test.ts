import { expect } from 'chai'

import { acquire, refresh, release } from '../../../src/fair-semaphore/index'
import { delay } from '../../../src/utils/index'
import client from '../../redisClient'

describe('fair-semaphore', () => {
  describe('acquire', () => {
    it('should return identifier on success acquire', async () => {
      const id = await acquire(client, 'key', 3, 100, 50, 10)
      expect(id).to.be.ok
      expect(await client.zrange('semaphore:key', 0, -1)).to.be.eql([id])
    })
    it('should acquire maximum LIMIT times', async () => {
      const pr1 = Promise.all([
        acquire(client, 'key', 3, 30, 50, 10),
        acquire(client, 'key', 3, 30, 50, 10),
        acquire(client, 'key', 3, 30, 50, 10)
      ])
      await delay(5)
      const pr2 = Promise.all([
        acquire(client, 'key', 3, 30, 50, 10),
        acquire(client, 'key', 3, 30, 50, 10),
        acquire(client, 'key', 3, 30, 50, 10)
      ])
      await pr1
      const ids1 = await client.zrange('semaphore:key', 0, -1)
      expect(ids1.length).to.be.eql(3)
      await pr2
      const ids2 = await client.zrange('semaphore:key', 0, -1)
      expect(ids2.length).to.be.eql(3)
      expect(ids2)
        .to.not.include(ids1[0])
        .and.not.include(ids1[1])
        .and.not.include(ids1[2])
    })
    it('should reject error after timeout', async () => {
      await Promise.all([
        acquire(client, 'key', 3, 1000, 50, 10),
        acquire(client, 'key', 3, 1000, 50, 10),
        acquire(client, 'key', 3, 1000, 50, 10)
      ])
      await expect(acquire(client, 'key', 3, 1000, 50, 10)).to.be.rejectedWith(
        /Acquire semaphore key timeout/
      )
    })
  })
  describe('refresh', () => {
    it('should refresh entry', async () => {
      const id1 = await acquire(client, 'key', 2, 50, 50, 10)
      await delay(5)
      const id2 = await acquire(client, 'key', 2, 50, 50, 10)
      expect(await client.zrange('semaphore:key', 0, -1)).to.have.members([
        id1,
        id2
      ])
      await refresh(client, 'key', id1)
      expect(await client.zrange('semaphore:key', 0, -1)).to.have.members([
        id2,
        id1
      ])
    })
  })
  describe('release', () => {
    it('should release acquired resource', async () => {
      const identifier = await acquire(client, 'key', 3, 50, 50, 10)
      expect(await client.zcard('semaphore:key')).to.be.eql(1)
      await release(client, 'key', identifier)
      expect(await client.zcard('semaphore:key')).to.be.eql(0)
    })
  })
})
