/* global expect client */

const createEval = require('../../../lib/utils/createEval')

describe('utils createEval', () => {
  it('should return function', async () => {
    expect(createEval('return 5')).to.be.a('function')
  })
  it('should call evalsha or fallback to eval', async () => {
    const now = Date.now()
    const SCRIPT = `return ${now}`
    const execScript = createEval(SCRIPT, 0)
    const result = await execScript(client)
    expect(result).to.be.eql(now)
    expect(Date.now() - now).to.be.lt(50)
  })
})
