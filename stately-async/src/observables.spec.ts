import 'mocha'
import { expect } from 'chai'

import { Subject } from 'rxjs'
import { Store, Action, createStore, applyMiddleware } from 'redux'

import { $toMiddleware, $toEvents, EventAPI } from './observables';

interface State { count: number }

describe('eventsFromActions', () => {
  const reducer = (state: State = { count: 0 }, action: Action) =>
    action.type === 'INCREMENT' ? { count: state.count + 1 } : state

  let action$: Subject<Action>
  let eventAPI: EventAPI<Action>
  let store: Store

  beforeEach(() => {
    action$ = new Subject()
    eventAPI = $toEvents(action$)
    store = createStore(
      reducer,
      applyMiddleware($toMiddleware(action$))
    )
  })
  
  it('should call the handler when a matching action is dispatched', (done) => {
    let expectedCount: number
    let actions = [{ type: 'INCREMENT' }, { type: 'INCREMENT' }, { type: 'INCREMENT' }]
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
