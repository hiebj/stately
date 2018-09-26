import 'mocha'
import { expect } from 'chai'
import { spy } from 'sinon'

import { Subject } from 'rxjs'
import { Store, Action, createStore, applyMiddleware } from 'redux'

import { EventAPI, SubjectLike, $toMiddleware, $toEvents, $fromStore } from './observables';

interface State { count: number }

const reducer = (state: State = { count: 0 }, action: Action) =>
  action.type === 'INCREMENT' ? { count: state.count + 1 } : state

let action$: Subject<Action>
let eventAPI: EventAPI<Action>
let store: Store<State>

beforeEach(() => {
  action$ = new Subject()
  eventAPI = $toEvents(action$)
  store = createStore(
    reducer,
    applyMiddleware($toMiddleware(action$))
  )
})

describe('$toMiddleware', () => {
  it('should pipe all dispatched actions into the given Subject', () => {
    const subscriberSpy = spy()
    const actions = [{ type: 'INCREMENT' }, { type: 'INCREMENT' }, { type: 'INCREMENT' }]
    action$.subscribe(subscriberSpy)
    actions.forEach(store.dispatch)
    expect(subscriberSpy).to.have.been.calledThrice
    expect(subscriberSpy).to.have.been.calledWithMatch({ type: 'INCREMENT' })
  })
})

describe('$toEvents', () => {
  it('should call the handler when a matching action is dispatched', (done) => {
    let expectedCount: number
    const actions = [{ type: 'INCREMENT' }, { type: 'INCREMENT' }, { type: 'INCREMENT' }]
    eventAPI.on(
      action => action.type === 'INCREMENT',
      () => {
        expect(store.getState()).to.have.property('count', expectedCount)
        if (expectedCount === actions.length) {
          done()
        }
      },
      done
    )
    actions.forEach((action, index) => {
      expectedCount = index + 1
      store.dispatch(action)
    })
  })
  
  it('should call the error handler when an exception is thrown in the handler', (done) => {
    eventAPI.on(
      action => action.type === 'INCREMENT',
      () => { throw 'err' },
      err => {
        expect(err).to.equal('err')
        done()
      }
    )
    store.dispatch({ type: 'INCREMENT' })
  })
})

describe('$fromStore', () => {
  let subject$: SubjectLike<State, Action>

  beforeEach(() => {
    subject$ = $fromStore(store)
  })

  it('should immediately notify new subscribers with the Store\'s current state', () => {
    subject$ = $fromStore(store)
    const subscriberSpy = spy()
    subject$.subscribe(subscriberSpy)
    expect(subscriberSpy).to.have.been.calledWithMatch(store.getState())
  })

  it('should notify all subscribers when the Store\'s state changes', () => {
    const subscriberSpy1 = spy()
    const subscriberSpy2 = spy()
    const actions = [{ type: 'INCREMENT' }, { type: 'INCREMENT' }]
    subject$.subscribe(subscriberSpy1)
    subject$.subscribe(subscriberSpy2)
    actions.forEach(store.dispatch)
    // thrice because they get called once when they initially subscribe
    expect(subscriberSpy1).to.have.been.calledThrice
    expect(subscriberSpy1).to.have.been.calledWithMatch(store.getState())
    expect(subscriberSpy2).to.have.been.calledThrice
    expect(subscriberSpy2).to.have.been.calledWithMatch(store.getState())
  })

  it('should dispatch actions on the Store when next() is called', () => {
    const subscriberSpy = spy()
    const actions = [{ type: 'INCREMENT' }, { type: 'INCREMENT' }, { type: 'INCREMENT' }]
    store.subscribe(subscriberSpy)
    actions.forEach(action => subject$.next(action))
    expect(subscriberSpy).to.have.been.calledThrice
    expect(store.getState()).to.have.property('count', 3)
  })
})
