import { createEval } from '../../../src/utils/index'
import { client1 as client } from '../../redisClient'

describe('utils createEval', () => {
  it('should return function', async () => {
    expect(createEval('return 5', 0)).toBeTypeOf('function')
  })
  it('should call evalsha or fallback to eval', async () => {
    const now = Date.now()
    const SCRIPT = `return ${now}`
    const execScript = createEval(SCRIPT, 0)
    const result = await execScript(client, [])
    expect(result).toEqual(now)
    expect(Date.now() - now).toBeLessThan(50)
  })
  it('should handle eval errors', async () => {
    const execScript = createEval('return asdfkasjdf', 0)
    await expect(execScript(client, [])).rejects.toThrow(
      'nonexistent global variable'
    )
  })
})
