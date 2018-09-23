import 'mocha'
import { expect } from 'chai'

import { of as $of } from 'rxjs'

import { AsyncState, AsyncSlice, initialAsyncState, StatelyAsyncSymbol } from './AsyncState'

import { statelyAsyncReducer } from './reducer'
import { AsyncLifecycle, asyncLifecycle } from './AsyncLifecycle'

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

const errorState: AsyncState<Item> = { status: 'error', params: null, error, data }
const openState: AsyncState<Item, Params> = {
  status: 'active',
  params,
  error: null,
  data,
}
const createAsyncSlice = <Item, Params>(asyncState: AsyncState<Item, Params>, id: string): AsyncSlice => ({
  [StatelyAsyncSymbol]: { [id]: asyncState },
})

let noParamsActions: AsyncLifecycle<any, []>
let withParamsActions: AsyncLifecycle<any, any>

beforeEach(() => {
  noParamsActions = asyncLifecycle(noParamsEffect$)
  withParamsActions = asyncLifecycle(withParamsEffect$)
})

afterEach(() => {
  statelyAsyncReducer({ [StatelyAsyncSymbol]: {} }, withParamsActions.destroy())
  statelyAsyncReducer({ [StatelyAsyncSymbol]: {} }, noParamsActions.destroy())
})

describe('statelyAsyncReducer', () => {
  let state: AsyncState<Params> = initialAsyncState

  describe('#call action', () => {
    beforeEach(() => {
      state = statelyAsyncReducer({ [StatelyAsyncSymbol]: {} }, withParamsActions.call(params))[StatelyAsyncSymbol][withParamsActions.id]
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
      state = statelyAsyncReducer(createAsyncSlice(openState, noParamsActions.id), noParamsActions.call())[StatelyAsyncSymbol][
        noParamsActions.id
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
        createAsyncSlice(initialAsyncState, withParamsActions.id),
        withParamsActions.call(params),
      )[StatelyAsyncSymbol][withParamsActions.id]
      state = statelyAsyncReducer(createAsyncSlice(state, withParamsActions.id), withParamsActions.data(data))[StatelyAsyncSymbol][
        withParamsActions.id
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
      state = statelyAsyncReducer(createAsyncSlice(openState, withParamsActions.id), withParamsActions.error(error))
        [StatelyAsyncSymbol][withParamsActions.id]
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
      state = statelyAsyncReducer(createAsyncSlice(errorState, withParamsActions.id), withParamsActions.complete())[StatelyAsyncSymbol][
        withParamsActions.id
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
    let slice: AsyncSlice[typeof StatelyAsyncSymbol]
    beforeEach(() => {
      slice = statelyAsyncReducer(createAsyncSlice(openState, withParamsActions.id), withParamsActions.destroy())[StatelyAsyncSymbol]
    })
    it('should remove the AsyncState with the matching `id` completely from the state tree', () => {
      expect(slice).not.to.have.property(withParamsActions.id)
    })
  })
})
