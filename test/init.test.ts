import { init, removeAllListeners } from './unhandledRejection'

before(() => {
  init()
})

after(() => {
  removeAllListeners()
})
