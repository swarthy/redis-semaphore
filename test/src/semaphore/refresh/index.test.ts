import { expect } from 'chai'

import {
  Options,
  refreshSemaphore as refresh
} from '../../../../src/semaphore/refresh/index'
import { client1 as client } from '../../../redisClient'

const opts = (id: string): Options => ({
  identifier: id,
  lockTimeout: 100
})

describe('semaphore refresh', () => {
  it('should return false if resource is already acquired', async () => {
    const now = '' + (Date.now() - 10)
    await client.zadd('key', now, '222', now, '333', now, '444')
    const result = await refresh(client, 'key', 3, opts('111'))
    expect(await client.zrange('key', 0, -1)).to.be.eql(['222', '333', '444'])
    expect(result).to.be.false
  })
  it('should return false if resource is already acquired, but some expired', async () => {
    const now = '' + (Date.now() - 10)
    const oldNow = '' + (Date.now() - 10000)
    await client.zadd('key', oldNow, '222', now, '333', now, '444')
    expect(await client.zrange('key', 0, -1)).to.be.eql(['222', '333', '444'])
    const result = await refresh(client, 'key', 3, opts('111'))
    expect(await client.zrange('key', 0, -1)).to.be.eql(['333', '444'])
    expect(result).to.be.false
  })
  it('should return false if resource is not acquired', async () => {
    const result = await refresh(client, 'key', 3, opts('111'))
    expect(await client.zrange('key', 0, -1)).to.be.eql([])
    expect(result).to.be.false
  })
  it('should return true for success refresh', async () => {
    const now = '' + (Date.now() - 10)
    await client.zadd('key', now, '111', now, '222', now, '333')
    expect(await client.zrange('key', 0, -1)).to.be.eql(['111', '222', '333'])
    const result = await refresh(client, 'key', 3, opts('111'))
    expect(await client.zrange('key', 0, -1)).to.be.eql(['222', '333', '111'])
    expect(result).to.be.true
  })
})
