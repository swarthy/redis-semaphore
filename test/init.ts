import { init, removeAllListeners } from './unhandledRejection'

beforeAll(() => {
  init()
})

afterAll(() => {
  removeAllListeners()
})
