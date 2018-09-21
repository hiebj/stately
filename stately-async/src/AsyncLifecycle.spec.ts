import * as chai from 'chai'
import { of as $of } from 'rxjs'
import 'mocha'
const { expect } = chai

import { AsyncState, AsyncSlice, StatelyAsyncSymbol } from './AsyncState'

import { AsyncLifecycle, asyncLifecycle } from './AsyncLifecycle'

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

const activeSession: AsyncState<Data, Params> = {
  status: 'active',
  params,
  error: null,
  data,
}
const sessionSlice = <Data, Params>(fxState: AsyncState<Data, Params>, id: string): AsyncSlice => ({
  [StatelyAsyncSymbol]: { [id]: fxState },
})

let withParamsActions: AsyncLifecycle<Data, [Params]>

beforeEach(() => {
  withParamsActions = asyncLifecycle(withParamsAsync$)
})

describe('asyncLifecycle()', () => {
  it('should return a new AsyncLifecycle with a unique ID', () => {
    expect(withParamsActions).to.have.property('operation', withParamsAsync$)
    expect(withParamsActions).to.have.property('id')
  })
})

describe('AsyncLifecycle', () => {
  describe('action creators', () => {
    it('should create actions with metadata describing the lifecycle instance', () => {
      const nextAction = withParamsActions.data(data)
      expect(nextAction).to.have.property('type', `stately-async/withParamsAsync$/data`)
      expect(nextAction).to.deep.property('payload', [data])
      expect(nextAction[StatelyAsyncSymbol]).to.have.property('id')
    })

    describe('match property', () => {
      it('should be a type guard that returns true iff the given action matches the type and lifecycle instance ID of the action creator', () => {
        expect(withParamsActions.data.match(withParamsActions.data(data))).to.be.true
        expect(withParamsActions.data.match(withParamsActions.call(params))).to.be.false
        // giving it a name so that fxActions doesn't complain
        function asyncFn() {
          return Promise.resolve(10)
        }
        expect(withParamsActions.data.match(asyncLifecycle(asyncFn).data(10))).to.be.false
        expect(withParamsActions.data.match({ type: 'BLAH' })).to.be.false
      })
    })
  })

  describe('selector', () => {
    it('should return the `AsyncState` managed by this instance', () => {
      const state = sessionSlice(activeSession, withParamsActions.id)
      const selector = withParamsActions.selector
      expect(selector(state)).to.have.property('status', 'active')
      expect(selector(state)).to.have.property('data', data)
    })
  })
})
