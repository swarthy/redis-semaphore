import { expect } from 'chai'
import Redis from 'ioredis'
import { getConnectionName } from '../../../src/utils/index'
import { client1 } from '../../redisClient'

describe('utils getConnectionName', () => {
  it('should return connection name', async () => {
    expect(getConnectionName(client1)).to.be.eql('<client1>')
  })
  it('should return unknown if connection name not configured', () => {
    const client = new Redis('redis://127.0.0.1:6000', {
      lazyConnect: true,
      enableOfflineQueue: false,
      autoResendUnfulfilledCommands: false, // dont queue commands while server is offline (dont break test logic)
      maxRetriesPerRequest: 0 // dont retry, fail faster (default is 20)
    })
    expect(getConnectionName(client)).to.be.eql('<unknown client>')
  })
})
