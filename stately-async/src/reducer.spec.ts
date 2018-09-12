import * as chai from 'chai'
import { of as $of } from 'rxjs'
import 'mocha'
const expect = chai.expect

import { AsyncSession, AsyncSessionSlice, initialAsyncSession, StatelyAsyncSymbol } from './AsyncSession'

import { statelyAsyncReducer } from './reducer'
import { createAsyncSession, AsyncSessionManager } from './actions'

interface Params {
  param1: string
  param2: string
}
interface Item {
  prop1: boolean
  prop2: number
}

const params: Params = { param1: 'abc', param2: '123' }
const data: Item = { prop1: true, prop2: 10 }
const error = 'error'

const noParamsEffect$ = () => $of(data)

async function* withParamsEffect$(params: Params) {
  if (params) {
    const toYield = await noParamsEffect$().toPromise()
    yield toYield
  } else {
    yield null
  }
}

const errorState: AsyncSession<Item> = { status: 'error', params: null, error, data }
const openState: AsyncSession<Item, Params> = {
  status: 'active',
  params,
  error: null,
  data,
}
const fxSlice = <Item, Params>(fxState: AsyncSession<Item, Params>, id: string): AsyncSessionSlice => ({
  [StatelyAsyncSymbol]: { [id]: fxState },
})

let noParamsActions: AsyncSessionManager<any, []>
let withParamsActions: AsyncSessionManager<any, any>

beforeEach(() => {
  noParamsActions = createAsyncSession(noParamsEffect$)
  withParamsActions = createAsyncSession(withParamsEffect$)
})

afterEach(() => {
  statelyAsyncReducer({ [StatelyAsyncSymbol]: {} }, withParamsActions.destroy())
  statelyAsyncReducer({ [StatelyAsyncSymbol]: {} }, noParamsActions.destroy())
})

describe('statelyAsyncReducer', () => {
  let state: AsyncSession<Params> = initialAsyncSession

  describe('#call action', () => {
    beforeEach(() => {
      state = statelyAsyncReducer({ [StatelyAsyncSymbol]: {} }, withParamsActions.call(params))[StatelyAsyncSymbol][withParamsActions.sid]
    })
    it('should set `state` to "active"', () => {
      expect(state).to.have.property('status', 'active')
    })
    it('should set `params` to the value passed into the action', () => {
      expect(state).to.deep.property('params', [params])
    })
    it('should set `error` to null', () => {
      expect(state).to.have.property('error', null)
    })
  })

  describe('no-params #call action', () => {
    beforeEach(() => {
      state = statelyAsyncReducer(fxSlice(openState, noParamsActions.sid), noParamsActions.call())[StatelyAsyncSymbol][
        noParamsActions.sid
      ]
    })
    it('should set `state` to "open"', () => {
      expect(state).to.have.property('status', 'active')
    })
    it('should set `params` to null', () => {
      expect(state).to.deep.property('params', [])
    })
    it('should set `error` to null', () => {
      expect(state).to.have.property('error', null)
    })
  })

  describe('#data action', () => {
    beforeEach(() => {
      state = statelyAsyncReducer(
        fxSlice(initialAsyncSession, withParamsActions.sid),
        withParamsActions.call(params),
      )[StatelyAsyncSymbol][withParamsActions.sid]
      state = statelyAsyncReducer(fxSlice(state, withParamsActions.sid), withParamsActions.data(data))[StatelyAsyncSymbol][
        withParamsActions.sid
      ]
    })

    it('should replace `data` with the value passed to the action', () => {
      expect(state).to.have.property('data', data)
    })
    it('should set `error` to null', () => {
      expect(state).to.have.property('error', null)
    })
  })

  describe('#error action', () => {
    beforeEach(() => {
      state = statelyAsyncReducer(fxSlice(openState, withParamsActions.sid), withParamsActions.error(error))
        [StatelyAsyncSymbol][withParamsActions.sid]
    })
    it('should set `state` to "error"', () => {
      expect(state).to.have.property('status', 'error')
    })
    it('should set `error` to the passed in error', () => {
      expect(state).to.have.property('error', error)
    })
  })

  describe('#complete action', () => {
    beforeEach(() => {
      state = statelyAsyncReducer(fxSlice(errorState, withParamsActions.sid), withParamsActions.complete())[StatelyAsyncSymbol][
        withParamsActions.sid
      ]
    })
    it('should set `state` to "completed"', () => {
      expect(state).to.have.property('status', 'completed')
    })
    it('should set `error` to null', () => {
      expect(state).to.have.property('error', null)
    })
  })

  describe('#destroy action', () => {
    let slice: AsyncSessionSlice[typeof StatelyAsyncSymbol]
    beforeEach(() => {
      slice = statelyAsyncReducer(fxSlice(openState, withParamsActions.sid), withParamsActions.destroy())[StatelyAsyncSymbol]
    })
    it('should remove the ID completely from the FxSlice', () => {
      expect(slice).not.to.have.property(withParamsActions.sid)
    })
  })
})
