import * as chai from 'chai'
import * as sinon from 'sinon'
import { Observable, Subject } from 'rxjs'
import { Store, createStore, applyMiddleware, Reducer, Action } from 'redux'
import 'mocha'
const { expect } = chai

import { AsyncLifecycle, asyncLifecycle } from './AsyncLifecycle'

import { AsyncOperation } from './AsyncOperation'

import { statelyAsyncMiddleware, statelyAsyncEpic } from './middleware'

type Params = [string, number]
interface Item {
  prop1: boolean
  prop2: number
}

const param1 = 'abc'
const param2 = 123
const data: Item = { prop1: true, prop2: 10 }
const error = 'error'

describe('statelyAsyncMiddleware: integration tests', () => {
  let reducer: Reducer<{}> & sinon.SinonSpy
  let store: Store<{}>
  let operation: AsyncOperation<Item, Params>
  let lifecycle: AsyncLifecycle<Item, Params>
  let resolve: (i: Item) => void
  let reject: (reason: any) => void
  let callAction: Action

  const asyncOp = async (_p: Params) =>
    new Promise<Item>((res, rej) => {
      resolve = res
      reject = rej
    })

  beforeEach(() => {
    reducer = sinon.spy((_state: {}, _action: Action) => ({}))
    store = createStore(reducer, applyMiddleware(statelyAsyncMiddleware))
    operation = sinon.spy(asyncOp)
    lifecycle = asyncLifecycle(operation)
    callAction = lifecycle.call(param1, param2)
    store.dispatch(callAction)
  })

  describe('a call action is dispatched', () => {
    it('should call the reducer', () => {
      expect(reducer).to.have.been.calledWithMatch({}, callAction)
    })

    it('should call the AsyncOperation', () => {
      expect(operation).to.have.been.calledWithMatch(param1, param2)
    })

    describe('async function resolves', () => {
      it('should dispatch a data() action, followed by a complete() action', done => {
        const expectedActions = [lifecycle.data(data), lifecycle.complete()]
        store.subscribe(() => {
          expect(reducer).to.have.been.calledWithMatch({}, expectedActions.shift())
          if (!expectedActions.length) {
            done()
          }
        })
        resolve(data)
      })
    })

    describe('async function is rejected', () => {
      it('should dispatch an error() action', done => {
        store.subscribe(() => {
          expect(reducer).to.have.been.calledWithMatch({}, lifecycle.error(error))
          done()
        })
        reject(error)
      })
    })
  })
})

describe('statelyAsyncEpic', () => {
  let fakeEffectSubject$: Subject<Item>
  let asyncFn: AsyncOperation<Item, Params>
  let actions: AsyncLifecycle<Item, Params>
  let action$: Subject<Action>
  let action$out: Observable<Action>

  beforeEach(() => {
    asyncFn = sinon.spy((_1: string, _2: number) => {
      fakeEffectSubject$ = new Subject()
      sinon.spy(fakeEffectSubject$, 'subscribe')
      return fakeEffectSubject$
    })
    actions = asyncLifecycle(asyncFn)
    action$ = new Subject()
    action$out = statelyAsyncEpic(action$)
  })

  describe('a \'call\' AsyncAction is dispatched', () => {
    it('should call the corresponding AsyncOperation and begin listening for output', () => {
      action$out.subscribe()
      action$.next(actions.call(param1, param2))
      expect(asyncFn).to.have.been.calledWith(param1, param2)
      expect(fakeEffectSubject$.subscribe).to.have.been.called
    })

    describe('a subsequent \'call\' action is dispatched for the same lifecycle', () => {
      it('should stop monitoring the output of the previous call', () => {
        const subscription = sinon.spy()
        action$out.subscribe(subscription)
        action$.next(actions.call(param1, param2))
        const origSubject = fakeEffectSubject$
        action$.next(actions.call(param1, param2))
        origSubject.next(data)
        expect(subscription).not.to.have.been.called
      })

      it('should call the AsyncOperation again, and begin monitoring the output of the new call', () => {
        const subscription = sinon.spy()
        action$out.subscribe(subscription)
        action$.next(actions.call(param1, param2))
        const origSubject = fakeEffectSubject$
        fakeEffectSubject$.next(data)
        expect(subscription).to.have.been.calledWithMatch(actions.data(data))
        action$.next(actions.call(param1, param2))
        origSubject.next(data)
        expect(subscription).not.to.have.been.calledTwice
        fakeEffectSubject$.next(data)
        expect(subscription).to.have.been.calledTwice
      })
    })
  })

  describe('monitoring the output of a called AsyncOperation', () => {
    describe('data is emitted', () => {
      it('should emit a `data` action containing the emitted data', () => {
        const subscription = sinon.spy()
        action$out.subscribe(subscription)
        action$.next(actions.call(param1, param2))
        fakeEffectSubject$.next(data)
        expect(subscription).to.have.been.calledWithMatch(actions.data(data))
      })
    })

    describe('an error is encountered', () => {
      it('should emit an `error` action containing the encountered error', () => {
        const subscription = sinon.spy()
        action$out.subscribe(subscription)
        action$.next(actions.call(param1, param2))
        fakeEffectSubject$.error(error)
        expect(subscription).to.have.been.calledWithMatch(actions.error(error))
      })
    })

    describe('the asynchronous task is completed', () => {
      it('should emit an empty `complete` action', () => {
        const subscription = sinon.spy()
        action$out.subscribe(subscription)
        action$.next(actions.call(param1, param2))
        fakeEffectSubject$.complete()
        expect(subscription).to.have.been.calledWithMatch(actions.complete())
      })
    })
  })

  describe('a \'destroy\' AsyncAction is dispatched', () => {
    it('should stop monitoring the output of the active call', () => {
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
