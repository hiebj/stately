import * as chai from 'chai'
import { of as $of } from 'rxjs'
import 'mocha'
const expect = chai.expect

import { AsyncSession, AsyncSessionSlice, StatelyAsyncSymbol } from './AsyncSession'

import { createAsyncSession, asyncActionMatcher, AsyncSessionManager } from './actions'

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

const activeSession: AsyncSession<Data, Params> = {
  status: 'active',
  params,
  error: null,
  data,
}
const sessionSlice = <Data, Params>(fxState: AsyncSession<Data, Params>, id: string): AsyncSessionSlice => ({
  [StatelyAsyncSymbol]: { [id]: fxState },
})

let withParamsActions: AsyncSessionManager<Data, [Params]>

beforeEach(() => {
  withParamsActions = createAsyncSession(withParamsAsync$)
})

describe('createAsyncSession()', () => {
  it('should return a new AsyncSessionManager with a unique ID', () => {
    expect(withParamsActions).to.have.property('asyncFunction', withParamsAsync$)
    expect(withParamsActions).to.have.property('sid')
  })
})

describe('asyncActionMatcher(type, asyncFunction)', () => {
  it ('should return a type guard that returns true iff the given action matches the given `type` and `asyncFunction`', () => {
    const matcher = asyncActionMatcher('call', withParamsAsync$)
    expect(matcher(withParamsActions.call(params))).to.be.true
    expect(matcher(createAsyncSession(withParamsAsync$).call(params))).to.be.true
    expect(matcher(withParamsActions.data(data))).to.be.false
    expect(matcher(createAsyncSession(noParamsAsync$).call())).to.be.false
  })
})

describe('AsyncSessionManager', () => {
  describe('action creators', () => {
    it('should create actions with metadata describing the session', () => {
      const nextAction = withParamsActions.data(data)
      expect(nextAction).to.have.property('type', `stately-async/withParamsAsync$/data`)
      expect(nextAction).to.deep.property('payload', [data])
      expect(nextAction[StatelyAsyncSymbol]).to.have.property('sid')
    })

    describe('match property', () => {
      it('should be a type guard that returns true iff the given action matches the type and session ID of the action creator', () => {
        expect(withParamsActions.data.match(withParamsActions.data(data))).to.be.true
        expect(withParamsActions.data.match(withParamsActions.call(params))).to.be.false
        // giving it a name so that fxActions doesn't complain
        function effect() {
          return Promise.resolve(10)
        }
        expect(withParamsActions.data.match(createAsyncSession(effect).data(10))).to.be.false
        expect(withParamsActions.data.match({ type: 'BLAH' })).to.be.false
      })
    })
  })

  describe('selector', () => {
    it('should return the AsyncSession managed by this instance', () => {
      const state = sessionSlice(activeSession, withParamsActions.sid)
      const selector = withParamsActions.selector
      expect(selector(state)).to.have.property('status', 'active')
      expect(selector(state)).to.have.property('data', data)
    })
  })
})
