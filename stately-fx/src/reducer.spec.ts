import * as chai from 'chai'
import { of as $of } from 'rxjs'
import 'mocha'
const expect = chai.expect

import { FxState, FxSlice, initialFxState } from './FxState'

import { fxReducer } from './reducer'
import { NoParamsFxActionCreators, FxActionCreators, fxActions } from './actions'

describe('fx-state', () => {
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

  const errorState: FxState<Item> = { status: 'error', params: null, error, data }
  const openState: FxState<Item, Params> = {
    status: 'active',
    params,
    error: null,
    data,
  }
  const fxSlice = <Item, Params>(fxState: FxState<Item, Params>, id: string): FxSlice => ({
    fx: { [id]: fxState },
  })

  let noParamsActions: NoParamsFxActionCreators<any>
  let withParamsActions: FxActionCreators<any, any>

  beforeEach(() => {
    noParamsActions = fxActions(noParamsEffect$)
    withParamsActions = fxActions(withParamsEffect$)
  })

  afterEach(() => {
    fxReducer({ fx: {} }, withParamsActions.destroy())
    fxReducer({ fx: {} }, noParamsActions.destroy())
  })

  describe('fxReducer', () => {
    let state: FxState<Params> = initialFxState

    describe('#call action', () => {
      beforeEach(() => {
        state = fxReducer({ fx: {} }, withParamsActions.call(params)).fx[withParamsActions.id]
      })
      it('should set `state` to "active"', () => {
        expect(state).to.have.property('status', 'active')
      })
      it('should set `params` to the value passed into the action', () => {
        expect(state).to.have.property('params', params)
      })
      it('should set `error` to null', () => {
        expect(state).to.have.property('error', null)
      })
    })

    describe('no-params #call action', () => {
      beforeEach(() => {
        state = fxReducer(fxSlice(openState, noParamsActions.id), noParamsActions.call()).fx[
          noParamsActions.id
        ]
      })
      it('should set `state` to "open"', () => {
        expect(state).to.have.property('status', 'active')
      })
      it('should set `params` to null', () => {
        expect(state).to.have.property('params', null)
      })
      it('should set `error` to null', () => {
        expect(state).to.have.property('error', null)
      })
    })

    describe('#data action', () => {
      beforeEach(() => {
        state = fxReducer(
          fxSlice(initialFxState, withParamsActions.id),
          withParamsActions.call(params),
        ).fx[withParamsActions.id]
        state = fxReducer(fxSlice(state, withParamsActions.id), withParamsActions.data(data)).fx[
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
        state = fxReducer(fxSlice(openState, withParamsActions.id), withParamsActions.error(error))
          .fx[withParamsActions.id]
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
        state = fxReducer(fxSlice(errorState, withParamsActions.id), withParamsActions.complete())
          .fx[withParamsActions.id]
      })
      it('should set `state` to "completed"', () => {
        expect(state).to.have.property('status', 'completed')
      })
      it('should set `error` to null', () => {
        expect(state).to.have.property('error', null)
      })
    })

    describe('#destroy action', () => {
      let slice: FxSlice['fx']
      beforeEach(() => {
        slice = fxReducer(fxSlice(openState, withParamsActions.id), withParamsActions.destroy()).fx
      })
      it('should remove the ID completely from rx state tracking', () => {
        expect(slice).not.to.have.property(withParamsActions.id)
      })
    })
  })
})
