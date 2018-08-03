import * as chai from 'chai'
import 'mocha'
import { of as $of } from 'rxjs'
const expect = chai.expect

import { FxState, FxSlice } from './FxState'

import { fxActions, FxActionCreators } from './actions'

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

  const noParamsEffect$ = () => $of(data)

  async function* withParamsEffect$(params: Params) {
    if (params) {
      const toYield = await noParamsEffect$().toPromise()
      yield toYield
    } else {
      yield null
    }
  }

  const openState: FxState<Item, Params> = {
    status: 'active',
    params,
    error: null,
    data,
  }
  const fxSlice = <Item, Params>(fxState: FxState<Item, Params>, id: string): FxSlice => ({
    fx: { [id]: fxState },
  })

  let withParamsActions: FxActionCreators<any, any>
  let withSubtypeActions: FxActionCreators<any, any>

  beforeEach(() => {
    withParamsActions = fxActions(withParamsEffect$)
    withSubtypeActions = fxActions({
      effect: withParamsEffect$,
      subtype: 'TEST',
    })
  })

  describe('fxActions', () => {
    it('should return a new set of action creators for a unique ID', () => {
      const nextAction = withParamsActions.next(data)
      expect(nextAction).to.have.property('type', `fx/withParamsEffect$/next`)
      expect(nextAction).to.have.property('payload', data)
      expect(nextAction.fx).to.have.property('id')
    })

    it('should return a new set of action creators for a given subtype', () => {
      const nextAction = withSubtypeActions.next(data)
      expect(nextAction).to.have.property('type', `fx/TEST/next`)
      expect(nextAction).to.have.property('payload', data)
      expect(nextAction.fx).to.have.property('id')
    })

    describe('selector', () => {
      it('should return a selector that returns the owned state of a set of actions', () => {
        const state = fxSlice(openState, withParamsActions.id)
        const selector = withParamsActions.selector
        expect(selector(state)).to.have.property('status', 'active')
        expect(selector(state)).to.have.property('data', data)
      })
    })
  })
})
