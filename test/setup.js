const chai = require('chai')
require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
chai.use(sinonChai)
global.expect = chai.expect

const redis = require('redis')

before(() => {
  global.client = redis.createClient()
})

beforeEach(async () => {
  global.client.flushdbAsync()
})

after(() => {
  global.client.quit()
})
