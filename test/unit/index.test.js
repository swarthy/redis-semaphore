/* global expect */

const { mutex, semaphore } = require('../../index')

describe('redis-semaphore', () => {
  describe('mutex', () => {
    expect(mutex).to.be.a('function')
  })
  describe('semaphore', () => {
    expect(semaphore).to.be.a('function')
  })
})
