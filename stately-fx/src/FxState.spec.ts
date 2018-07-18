import * as chai from 'chai'
import * as sinon from 'sinon'
import 'mocha'
import { Observable, Subscriber, of as $of } from 'rxjs'
import { AnyAction } from 'redux'
const expect = chai.expect

import { FxState, FxSlice, initialFxState } from './FxState'

import { fxActions, FxActionCreators, NoParamsFxActionCreators } from './actions'

import { Effect } from './effects'

import { fxReducer } from './reducer'

import { fxEpic } from './middleware'

describe('FxState', () => {
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
  let withSubtypeActions: FxActionCreators<any, any>

  beforeEach(() => {
    noParamsActions = fxActions(noParamsEffect$)
    withParamsActions = fxActions(withParamsEffect$)
    withSubtypeActions = fxActions({
      effect: withParamsEffect$,
      subtype: 'TEST',
    })
  })

  describe('fxActionCreatorsFactory', () => {
    it('should return a new set of action creators for a unique ID', () => {
      const nextAction = withParamsActions.next(data)
      expect(nextAction).to.have.property('type', `FX/withParamsEffect$/NEXT`)
      expect(nextAction).to.have.property('payload', data)
      expect(nextAction.fx).to.have.property('id')
    })

    it('should return a new set of action creators for a given subtype', () => {
      const nextAction = withSubtypeActions.next(data)
      expect(nextAction).to.have.property('type', `FX/TEST/NEXT`)
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

  describe('fxReducer', () => {
    let state: FxState<Params> = initialFxState

    describe('#subscribe action', () => {
      beforeEach(() => {
        state = fxReducer(
          fxSlice(openState, withParamsActions.id),
          withParamsActions.subscribe(params),
        ).fx[withParamsActions.id]
      })
      it('should set `state` to "open"', () => {
        expect(state).to.have.property('status', 'active')
      })
      it('should set `params` to the value passed into the action', () => {
        expect(state).to.have.property('params', params)
      })
      it('should set `error` to null', () => {
        expect(state).to.have.property('error', null)
      })
    })

    describe('no-params #subscribe action', () => {
      beforeEach(() => {
        state = fxReducer(fxSlice(openState, noParamsActions.id), noParamsActions.subscribe()).fx[
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

    describe('#next action', () => {
      beforeEach(() => {
        state = fxReducer(
          fxSlice(initialFxState, withParamsActions.id),
          withParamsActions.subscribe(params),
        ).fx[withParamsActions.id]
        state = fxReducer(fxSlice(state, withParamsActions.id), withParamsActions.next(data)).fx[
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

    describe('#unsubscribe action', () => {
      beforeEach(() => {
        state = fxReducer(fxSlice(openState, withParamsActions.id), withParamsActions.unsubscribe())
          .fx[withParamsActions.id]
      })
      it('should set `state` to null', () => {
        expect(state).to.have.property('status', null)
      })
      it('should set `params` to null', () => {
        expect(state).to.have.property('params', null)
      })
      it('should set `data` to null', () => {
        expect(state).to.have.property('data', null)
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

  describe('Epic', () => {
    let asyncObservable$: Observable<Item>
    let asyncObservable$subscriber: Subscriber<Item>
    let asyncObservableFactory$: Effect<Item, Params>
    let actions: FxActionCreators<Item, Params>
    let action$: Observable<AnyAction>
    let action$subscriber: Subscriber<AnyAction>
    let action$out: Observable<AnyAction>

    beforeEach(() => {
      asyncObservable$ = new Observable<Item>(subscriber => {
        asyncObservable$subscriber = subscriber
      })
      sinon.spy(asyncObservable$, 'subscribe')
      asyncObservableFactory$ = sinon.spy((params: Params) => params && asyncObservable$)
      actions = fxActions(asyncObservableFactory$)
      action$ = new Observable<AnyAction>(subscriber => {
        action$subscriber = subscriber
      })
      action$out = fxEpic(action$)
    })

    describe('#subscribe action', () => {
      describe('given an ObservableFactory', () => {
        it('should call a given ObservableFactory and subscribe to the resulting Observable', () => {
          action$out.subscribe()
          action$subscriber.next(actions.subscribe(params))
          expect(asyncObservableFactory$).to.have.been.calledWith(params)
          expect(asyncObservable$.subscribe).to.have.been.called
        })
      })
    })

    describe('observable$', () => {
      describe('#next', () => {
        it('should dispatch a `next` action with the payload sent by the Observable', () => {
          const subscription = sinon.spy()
          action$out.subscribe(subscription)
          action$subscriber.next(actions.subscribe(params))
          asyncObservable$subscriber.next(data)
          expect(subscription).to.have.been.calledWithMatch(actions.next(data))
        })
      })

      describe('#error', () => {
        it('should dispatch an `error` action with the payload sent by the Observable', () => {
          const subscription = sinon.spy()
          action$out.subscribe(subscription)
          action$subscriber.next(actions.subscribe(params))
          asyncObservable$subscriber.error(error)
          expect(subscription).to.have.been.calledWithMatch(actions.error(error))
        })
      })

      describe('#complete', () => {
        it('should dispatch a `complete` action', () => {
          const subscription = sinon.spy()
          action$out.subscribe(subscription)
          action$subscriber.next(actions.subscribe(params))
          asyncObservable$subscriber.complete()
          expect(subscription).to.have.been.calledWithMatch(actions.complete())
        })
      })
    })

    describe('#unsubscribe action', () => {
      it('should unsubscribe from the Observable', () => {
        const subscription = sinon.spy()
        action$out.subscribe(subscription)
        action$subscriber.next(actions.subscribe(params))
        asyncObservable$subscriber.next(data)
        expect(subscription).to.have.been.calledWithMatch(actions.next(data))
        action$subscriber.next(actions.unsubscribe())
        asyncObservable$subscriber.next(data)
        expect(subscription).not.to.have.been.calledTwice
      })
    })

    describe('#destroy action', () => {
      it('should unsubscribe from the Observable', () => {
        const subscription = sinon.spy()
        action$out.subscribe(subscription)
        action$subscriber.next(actions.subscribe(params))
        asyncObservable$subscriber.next(data)
        expect(subscription).to.have.been.calledWithMatch(actions.next(data))
        action$subscriber.next(actions.destroy())
        asyncObservable$subscriber.next(data)
        expect(subscription).not.to.have.been.calledTwice
      })
    })
  })
})
