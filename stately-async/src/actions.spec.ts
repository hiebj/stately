import 'mocha'
import { expect } from 'chai'

import { of as $of } from 'rxjs'

import { asyncActionMatcher, AsyncActionCreator, asyncActionCreatorFactory } from './actions'
import { asyncLifecycle } from './AsyncLifecycle'
import { StatelyAsyncSymbol } from './AsyncState'

interface Params {
  param1: string
  param2: string
}
interface Data {
  prop1: boolean
  prop2: number
}

const params: Params = { param1: 'abc', param2: '123' }
const data: Data = { prop1: true, prop2: 10 }

const noParamsAsync$ = () => $of(data)

async function* withParamsAsync$(_params: Params) {
  const toYield = await noParamsAsync$().toPromise()
  yield toYield
}

let callActionCreator: AsyncActionCreator<[Params]>
let dataActionCreator: AsyncActionCreator<[Data]>

beforeEach(() => {
  callActionCreator = asyncActionCreatorFactory(withParamsAsync$, 'testuuid')<[Params]>('call')
  dataActionCreator = asyncActionCreatorFactory(withParamsAsync$, 'testuuid')<[Data]>('data')
})

describe('asyncActionMatcher(asyncOperation, phase)', () => {
  it('should return a type guard that returns true iff the given action matches the given `type` and `asyncOperation`', () => {
    const matcher = asyncActionMatcher(withParamsAsync$, 'call')
    expect(matcher(callActionCreator(params))).to.be.true
    expect(matcher(asyncLifecycle(withParamsAsync$).call(params))).to.be.true
    expect(matcher(dataActionCreator(data))).to.be.false
    expect(matcher(asyncLifecycle(noParamsAsync$).call())).to.be.false
  })
})

describe('AsyncActionCreator', () => {
  it('should create actions with lifecycle metadata and the given payload', () => {
    const nextAction = dataActionCreator(data)
    expect(nextAction).to.have.property('type', 'async/withParamsAsync$/data')
    expect(nextAction).to.deep.property('payload', [data])
    expect(nextAction[StatelyAsyncSymbol]).to.have.property('id', 'testuuid')
  })

  describe('match property', () => {
    it('should be a type guard that returns true iff the given action matches the type and lifecycle instance ID of the action creator', () => {
      expect(dataActionCreator.match(dataActionCreator(data))).to.be.true
      expect(dataActionCreator.match(callActionCreator(params))).to.be.false
      // giving it a name so that fxActions doesn't complain
      function asyncFn() {
        return Promise.resolve(10)
      }
      expect(dataActionCreator.match(asyncLifecycle(asyncFn).data(10))).to.be.false
      expect(dataActionCreator.match({ type: 'BLAH' })).to.be.false
    })
  })
})
