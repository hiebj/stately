import 'mocha'
import { expect } from 'chai'
import { SinonFakeTimers, useFakeTimers } from 'sinon'
import { mount } from 'enzyme'

import * as React from 'react'
import { createStore, applyMiddleware, compose, Store, Action } from 'redux'
import { Subject } from 'rxjs';

import { asyncActionMatcher, statelyAsyncReducer, statelyAsyncMiddleware, AsyncSlice } from 'stately-async'
import { EventAPI, $toMiddleware, $toEvents } from 'stately-async/observables'

import { CallableAsync } from './CallableAsync'
import { AsyncController } from './Async';
import { createStoreContext, Subscription } from './Subscribable';

let StoreSubscription: Subscription<AsyncSlice, Action>
let StoreAsyncController: React.ComponentType

let clock: SinonFakeTimers
let testStore: Store<AsyncSlice>
let eventAPI: EventAPI<Action>

const effect = (p1: number, p2: string) =>
  new Promise<{ r1: number; r2: string }>(resolve => {
    setTimeout(() => resolve({ r1: p1 + 1, r2: p2.toLowerCase() }), 10)
  })

const TestComponent: React.SFC = () => (
  <StoreSubscription>
    <StoreAsyncController>
      <CallableAsync operation={effect}>
        {(state, call) => (
          <div>
            {state.data
              ? [
                  <span className="r1" key="r1">
                    {state.data.r1}
                  </span>,
                  <span className="r2" key="r2">
                    {state.data.r2}
                  </span>,
                ]
              : state.status === 'active' && <span className="loading" />}
            <button
              onClick={() => {call(1, 'PARAM')}}
            />
          </div>
        )}
      </CallableAsync>
    </StoreAsyncController>
  </StoreSubscription>
)

const isCompleteAction = asyncActionMatcher('complete')

describe('<CallableAsync>', () => {
  beforeEach(() => {
    clock = useFakeTimers()
    const action$ = new Subject<Action>()
    eventAPI = $toEvents(action$)
    testStore = createStore(
      statelyAsyncReducer,
      compose(
        applyMiddleware(statelyAsyncMiddleware),
        applyMiddleware($toMiddleware(action$)),
      ),
    )
    const { Subscription, subscriber } = createStoreContext(testStore)
    StoreSubscription = Subscription
    StoreAsyncController = subscriber(
      (state, dispatch) => ({ state, dispatch })
    )(AsyncController)
  })

  afterEach(() => {
    clock.restore()
  })

  describe('mount', () => {
    it('should pass initial effect state', () => {
      const wrapper = mount(<TestComponent />)
      expect(wrapper).not.to.have.descendants('.loading')
      expect(wrapper).not.to.have.descendants('.r1')
      expect(wrapper).not.to.have.descendants('.r2')
    })
  })

  describe('call hook', () => {
    it('should trigger the given `effect` and pass "active" effect state', () => {
      const wrapper = mount(<TestComponent />)
      wrapper.find('button').simulate('click')
      expect(wrapper).to.have.descendants('.loading')
    })
  })

  describe('`effect` yields data', () => {
    it('should pass the new data in the effect state', done => {
      const wrapper = mount(<TestComponent />)
      wrapper.find('button').simulate('click')
      eventAPI.on(
        isCompleteAction,
        () => {
          wrapper.update()
          expect(wrapper.find('.r1')).to.have.text('2')
          expect(wrapper.find('.r2')).to.have.text('param')
          done()
        },
        done,
      )
      clock.next()
    })
  })
})
