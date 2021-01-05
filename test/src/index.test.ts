import { expect } from 'chai'

import {
  MultiSemaphore, Mutex, RedlockMultiSemaphore, RedlockMutex, RedlockSemaphore, Semaphore
} from '../../src/index'

describe('index', () => {
  it('should export public API', () => {
    expect(Mutex).to.be.ok
    expect(Semaphore).to.be.ok
    expect(MultiSemaphore).to.be.ok
    expect(RedlockMutex).to.be.ok
    expect(RedlockSemaphore).to.be.ok
    expect(RedlockMultiSemaphore).to.be.ok
  })
})
