import { expect } from 'chai'

import { getConnectionName } from '../../../src/utils/index'
import { client1 as client } from '../../redisClient'

describe('utils getConnectionName', () => {
  it('should return connection name', async () => {
    expect(getConnectionName(client)).to.be.eql('<client1>')
  })
})
