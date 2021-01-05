import { expect } from 'chai'

import { getQuorum } from '../../../src/utils/redlock'

describe('redlockMutex utils', () => {
  describe('getQuorum', () => {
    function makeTest(count: number, expectedResult: number) {
      it(`should return valid majority for ${count} nodes`, () => {
        expect(getQuorum(count)).to.be.eql(expectedResult)
        expect(getQuorum(2)).to.be.eql(2)
        expect(getQuorum(3)).to.be.eql(2)
        expect(getQuorum(4)).to.be.eql(3)
        expect(getQuorum(5)).to.be.eql(3)
        expect(getQuorum(6)).to.be.eql(4)
        expect(getQuorum(7)).to.be.eql(4)
        expect(getQuorum(8)).to.be.eql(5)
        expect(getQuorum(9)).to.be.eql(5)
      })
    }
    // makeTest(0, 1)
    makeTest(1, 1)
    makeTest(2, 2)
    makeTest(3, 2)
    makeTest(4, 3)
    makeTest(5, 3)
    makeTest(6, 4)
    makeTest(7, 4)
    makeTest(8, 5)
    makeTest(9, 5)
  })
})
