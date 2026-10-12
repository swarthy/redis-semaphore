import {
  defaultTimeoutOptions,
  MultiSemaphore,
  Mutex,
  RedlockMultiSemaphore,
  RedlockMutex,
  RedlockSemaphore,
  Semaphore
} from '../../src/index'

describe('index', () => {
  it('should export public API', () => {
    expect(Mutex).toBeTruthy()
    expect(Semaphore).toBeTruthy()
    expect(MultiSemaphore).toBeTruthy()
    expect(RedlockMutex).toBeTruthy()
    expect(RedlockSemaphore).toBeTruthy()
    expect(RedlockMultiSemaphore).toBeTruthy()
    expect(defaultTimeoutOptions).toBeTruthy()
  })
})
