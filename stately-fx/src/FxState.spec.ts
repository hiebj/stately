import * as chai from 'chai'
import * as sinon from 'sinon'
import 'mocha'
import { Observable, Subscriber, of as $of } from 'rxjs'
import { AnyAction } from 'redux'
const expect = chai.expect

import {
  FxState,
  FxSlice,
  FxActionCreators,
  initialFxState,
  FxSource,
  fxActionCreatorsFactory,
  fxReducer,
  fxEpic,
} from './FxState'

describe('FxState', () => {
  interface Params {
    param1: string
    param2: string
  }
  interface Item {
    prop1: boolean
    prop2: number
  }

  const id = 'TESTID'
  const params: Params = { param1: 'abc', param2: '123' }
  const data: Item = { prop1: true, prop2: 10 }
  const error = 'error'

  const noParamsSource$ = () => $of(data)
  async function* withParamsSource$(params: Params) {
    if (params) {
      const toYield = await noParamsSource$().toPromise()
      yield toYield
    } else {
      yield null
    }
  }

  const type = 'TEST'
  const noParamsActions = fxActionCreatorsFactory('NOPARAMS', noParamsSource$)(id)
  const actionsFactory = fxActionCreatorsFactory(type, withParamsSource$)
  const forIdActions = actionsFactory(id)

  const errorState: FxState<Item> = { status: 'error', params: null, error, data }
  const subscribedState: FxState<Item, Params> = {
    status: 'subscribed',
    params,
    error: null,
    data,
  }
  const fxSlice = <Item, Params>(fxState: FxState<Item, Params>): FxSlice => ({
    fx: { [id]: fxState },
  })

  describe('fxActionCreatorsFactory', () => {
    describe('with a given ID', () => {
      it('should return a new set of action creators for a given ID', () => {
        const nextAction = actionsFactory(id).next(data)
        expect(nextAction).to.have.property('type', `FX/${type}/NEXT`)
        expect(nextAction).to.have.property('payload', data)
        expect(nextAction.fx).to.have.property('id', id)
      })
    })

    describe('no ID given', () => {
      it('should return a new set of action creators for a unique ID', () => {
        let nextAction = actionsFactory().next(data)
        expect(nextAction).to.have.property('type', `FX/${type}/NEXT`)
        expect(nextAction).to.have.property('payload', data)
        expect(nextAction.fx).to.have.property('id')
        const firstId = nextAction.fx.id
        nextAction = actionsFactory().next(data)
        expect(nextAction).to.have.property('type', `FX/${type}/NEXT`)
        expect(nextAction).to.have.property('payload', data)
        expect(nextAction.fx).to.have.property('id')
        expect(firstId).not.to.equal(nextAction.fx.id)
      })
    })

    describe('selector', () => {
      it('should return a selector that returns the owned state of a set of actions', () => {
        const state = fxSlice(subscribedState)
        const selector = forIdActions.selector
        expect(selector(state)).to.have.property('status', 'subscribed')
        expect(selector(state)).to.have.property('data', data)
      })
    })
  })

  describe('fxReducer', () => {
    let state: FxState<Params> = initialFxState

    describe('#subscribe action', () => {
      beforeEach(() => {
        state = fxReducer(fxSlice(errorState), forIdActions.subscribe(params)).fx[id]
      })
      it('should set `state` to "subscribing"', () => {
        expect(state).to.have.property('status', 'subscribing')
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
        state = fxReducer(fxSlice(subscribedState), noParamsActions.subscribe()).fx[id]
      })
      it('should set `state` to "subscribing"', () => {
        expect(state).to.have.property('status', 'subscribing')
      })
      it('should set `params` to null', () => {
        expect(state).to.have.property('params', null)
      })
      it('should set `error` to null', () => {
        expect(state).to.have.property('error', null)
      })
    })

    describe('#subscribe action', () => {
      beforeEach(() => {
        state = fxReducer(fxSlice(errorState), forIdActions.subscribe(params)).fx[id]
      })
      it('should set `state` to "subscribing"', () => {
        expect(state).to.have.property('status', 'subscribing')
      })
      it('should set `params` to the value passed into the action', () => {
        expect(state).to.have.property('params', params)
      })
      it('should set `error` to null', () => {
        expect(state).to.have.property('error', null)
      })
    })

    describe('#next action', () => {
      beforeEach(() => {
        state = fxReducer(fxSlice(initialFxState), forIdActions.subscribe(params)).fx[id]
        state = fxReducer(fxSlice(state), forIdActions.next(data)).fx[id]
      })

      it('should set `state` to "subscribed"', () => {
        expect(state).to.have.property('status', 'subscribed')
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
        state = fxReducer(fxSlice(subscribedState), forIdActions.error(error)).fx[id]
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
        state = fxReducer(fxSlice(subscribedState), forIdActions.complete()).fx[id]
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
        state = fxReducer(fxSlice(subscribedState), forIdActions.unsubscribe()).fx[id]
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
        slice = fxReducer(fxSlice(subscribedState), forIdActions.destroy()).fx
      })
      it('should remove the ID completely from rx state tracking', () => {
        expect(slice).not.to.have.property(id)
      })
    })
  })

  describe('Epic', () => {
    const id = 'EPICID'
    let asyncObservable$: Observable<Item>
    let asyncObservable$subscriber: Subscriber<Item>
    let asyncObservableFactory$: FxSource<Item, Params>
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
      actions = fxActionCreatorsFactory('EPIC', asyncObservableFactory$)(id)
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
