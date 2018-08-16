import * as chai from 'chai'
import * as sinon from 'sinon'
import { Observable, Subscriber } from 'rxjs'
import 'mocha'
import { Store, createStore, applyMiddleware, Reducer, AnyAction } from 'redux'
const expect = chai.expect

import { fxActions, FxActionCreators } from './actions'

import { Effect } from './effects'

import { fxMiddleware, fxEpic } from './middleware'

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

  describe('fxEpic', () => {
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

    describe('#call action', () => {
      describe('given an ObservableFactory', () => {
        it('should call a given ObservableFactory and subscribe to the resulting Observable', () => {
          action$out.subscribe()
          action$subscriber.next(actions.call(params))
          expect(asyncObservableFactory$).to.have.been.calledWith(params)
          expect(asyncObservable$.subscribe).to.have.been.called
        })

        it('should unsubscribe from the previous Observable when there is a new call action', () => {
          const subscription = sinon.spy()
          action$out.subscribe(subscription)
          action$subscriber.next(actions.call(params))
          asyncObservable$subscriber.next(data)
          expect(subscription).to.have.been.calledWithMatch(actions.data(data))
          action$subscriber.next(actions.call({ param1: 'other', param2: 'params' }))
          asyncObservable$subscriber.next(data)
          expect(subscription).not.to.have.been.calledTwice
        })
      })
    })

    describe('observable$', () => {
      describe('#data', () => {
        it('should dispatch a `data` action with the payload sent by the Observable', () => {
          const subscription = sinon.spy()
          action$out.subscribe(subscription)
          action$subscriber.next(actions.call(params))
          asyncObservable$subscriber.next(data)
          expect(subscription).to.have.been.calledWithMatch(actions.data(data))
        })
      })

      describe('#error', () => {
        it('should dispatch an `error` action with the payload sent by the Observable', () => {
          const subscription = sinon.spy()
          action$out.subscribe(subscription)
          action$subscriber.next(actions.call(params))
          asyncObservable$subscriber.error(error)
          expect(subscription).to.have.been.calledWithMatch(actions.error(error))
        })
      })

      describe('#complete', () => {
        it('should dispatch a `complete` action', () => {
          const subscription = sinon.spy()
          action$out.subscribe(subscription)
          action$subscriber.next(actions.call(params))
          asyncObservable$subscriber.complete()
          expect(subscription).to.have.been.calledWithMatch(actions.complete())
        })
      })
    })

    describe('#destroy action', () => {
      it('should unsubscribe from the Observable', () => {
        const subscription = sinon.spy()
        action$out.subscribe(subscription)
        action$subscriber.next(actions.call(params))
        asyncObservable$subscriber.next(data)
        expect(subscription).to.have.been.calledWithMatch(actions.data(data))
        action$subscriber.next(actions.destroy())
        asyncObservable$subscriber.next(data)
        expect(subscription).not.to.have.been.calledTwice
      })
    })
  })

  describe('fxMiddleware', () => {
    let reducer: Reducer<{}> & sinon.SinonSpy
    let store: Store<{}>
    let effect: Effect<Item, Params>
    let actions: FxActionCreators<Item, Params>
    let resolve: (i: Item) => void
    let reject: (reason: any) => void
    let callAction: AnyAction

    beforeEach(() => {
      reducer = sinon.spy((_state: {}, _action: AnyAction) => ({}))
      store = createStore(reducer, {}, applyMiddleware(fxMiddleware))
      effect = sinon.spy(
        async (_p: Params) =>
          new Promise<Item>((res, rej) => {
            resolve = res
            reject = rej
          }),
      )
      actions = fxActions(effect)
      callAction = actions.call(params)
      store.dispatch(callAction)
    })

    describe('dispatch #call action', () => {
      it('should call the reducer', () => {
        expect(reducer).to.have.been.calledWithMatch({}, callAction)
      })

      it('should call the effect', () => {
        expect(effect).to.have.been.calledWithMatch(params)
      })
    })

    describe('effect resolves', () => {
      it('should dispatch a data() action, followed by a complete() action', done => {
        const expectedActions = [actions.data(data), actions.complete()]
        store.subscribe(() => {
          expect(reducer).to.have.been.calledWithMatch({}, expectedActions.shift())
          if (!expectedActions.length) {
            done()
          }
        })
        resolve(data)
      })
    })

    describe('effect is rejected', () => {
      it('should dispatch an error() action', done => {
        store.subscribe(() => {
          expect(reducer).to.have.been.calledWithMatch({}, actions.error(error))
          done()
        })
        reject(error)
      })
    })
  })
})
