import { LockOptions } from '../../src'
import { Lock } from '../../src/Lock'
import { delay } from '../../src/utils'

describe('Lock', () => {
  describe('refresh and release race condition', () => {
    class TestLock extends Lock {
      protected _kind = 'test-lock'
      protected _key: string
      constructor(key: string, options: LockOptions) {
        super(options)
        this._key = key
      }
      protected async _refresh(): Promise<boolean> {
        await delay(200)
        return false
      }
      protected async _acquire(): Promise<boolean> {
        return true
      }
      protected async _release(): Promise<void> {}
    }
    it('should not throw LostLock error when refresh started but not finished before release happened', async function () {
      const lock = new TestLock('key', {
        lockTimeout: 1000,
        acquireTimeout: 1000,
        refreshInterval: 50
      })
      try {
        await lock.acquire()
        await delay(100)
      } finally {
        await lock.release()
      }
    })
  })
})
