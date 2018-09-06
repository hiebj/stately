import * as chai from 'chai'
import * as sinon from 'sinon'
import { Observable, Subject } from 'rxjs'
import { Store, createStore, applyMiddleware, Reducer, Action } from 'redux'
import 'mocha'
const expect = chai.expect

import { fxActions, FxActionCreators } from './actions'

import { Effect } from './effects'

import { fxMiddleware, fxEpic } from './middleware'

type Params = [string, number]
interface Item {
  prop1: boolean
  prop2: number
}

const param1 = 'abc'
const param2 = 123
const data: Item = { prop1: true, prop2: 10 }
const error = 'error'

describe('fxEpic', () => {
  let fakeEffectSubject$: Subject<Item>
  let effect: Effect<Item, Params>
  let actions: FxActionCreators<Item, Params>
  let action$: Subject<Action>
  let action$out: Observable<Action>

  beforeEach(() => {
    effect = sinon.spy((_1: string, _2: number) => {
      fakeEffectSubject$ = new Subject()
      sinon.spy(fakeEffectSubject$, 'subscribe')
      return fakeEffectSubject$
    })
    actions = fxActions(effect)
    action$ = new Subject()
    action$out = fxEpic(action$)
  })

  describe('a \'call\' FxAction is dispatched', () => {
    it('should call the corresponding Effect and subscribe to the resulting Observable', () => {
      action$out.subscribe()
      action$.next(actions.call(param1, param2))
      expect(effect).to.have.been.calledWith(param1, param2)
      expect(fakeEffectSubject$.subscribe).to.have.been.called
    })

    describe('a subsequent \'call\' action is dispatched', () => {
      it('should unsubscribe from the previous Observable', () => {
        const subscription = sinon.spy()
        action$out.subscribe(subscription)
        action$.next(actions.call(param1, param2))
        const origSubject = fakeEffectSubject$
        fakeEffectSubject$.next(data)
        expect(subscription).to.have.been.calledWithMatch(actions.data(data))
        action$.next(actions.call(param1, param2))
        origSubject.next(data)
        expect(subscription).not.to.have.been.calledTwice
      })

      it('should dispatch actions corresponding to the new Observable', () => {
        const subscription = sinon.spy()
        action$out.subscribe(subscription)
        action$.next(actions.call(param1, param2))
        action$.next(actions.call(param1, param2))
        fakeEffectSubject$.next(data)
        expect(subscription).not.to.have.been.calledTwice
      })
    })
  })

  describe('the subscribed Observable returned by the configured Effect', () => {
    describe('on #data', () => {
      it('should dispatch a `data` action with the payload sent by the Observable', () => {
        const subscription = sinon.spy()
        action$out.subscribe(subscription)
        action$.next(actions.call(param1, param2))
        fakeEffectSubject$.next(data)
        expect(subscription).to.have.been.calledWithMatch(actions.data(data))
      })
    })

    describe('on #error', () => {
      it('should dispatch an `error` action with the payload sent by the Observable', () => {
        const subscription = sinon.spy()
        action$out.subscribe(subscription)
        action$.next(actions.call(param1, param2))
        fakeEffectSubject$.error(error)
        expect(subscription).to.have.been.calledWithMatch(actions.error(error))
      })
    })

    describe('on #complete', () => {
      it('should dispatch an empty `complete` action', () => {
        const subscription = sinon.spy()
        action$out.subscribe(subscription)
        action$.next(actions.call(param1, param2))
        fakeEffectSubject$.complete()
        expect(subscription).to.have.been.calledWithMatch(actions.complete())
      })
    })
  })

  describe('a \'destroy\' FxAction is dispatched', () => {
    it('should unsubscribe from the corresponding Observable', () => {
      const subscription = sinon.spy()
      action$out.subscribe(subscription)
      action$.next(actions.call(param1, param2))
      fakeEffectSubject$.next(data)
      expect(subscription).to.have.been.calledWithMatch(actions.data(data))
      action$.next(actions.destroy())
      fakeEffectSubject$.next(data)
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
  let callAction: Action

  beforeEach(() => {
    reducer = sinon.spy((_state: {}, _action: Action) => ({}))
    store = createStore(reducer, {}, applyMiddleware(fxMiddleware))
    effect = sinon.spy(
      async (_p: Params) =>
        new Promise<Item>((res, rej) => {
          resolve = res
          reject = rej
        }),
    )
    actions = fxActions(effect)
    callAction = actions.call(param1, param2)
    store.dispatch(callAction)
  })

  it('should call the reducer', () => {
    expect(reducer).to.have.been.calledWithMatch({}, callAction)
  })

  it('should call the effect', () => {
    expect(effect).to.have.been.calledWithMatch(param1, param2)
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
