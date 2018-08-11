const chai = require('chai')
require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
chai.use(sinonChai)
global.expect = chai.expect

const Redis = require('ioredis')

before(() => {
  global.client = new Redis(process.env.REDIS_URL)
})

beforeEach(async () => {
  await global.client.flushdb()
})

after(() => {
  global.client.quit()
})
