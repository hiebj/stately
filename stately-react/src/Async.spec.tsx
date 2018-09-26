import 'mocha'
import { expect } from 'chai'
import { SinonFakeTimers, useFakeTimers } from 'sinon'
import { mount } from 'enzyme'

import * as React from 'react'
import { createStore, applyMiddleware, compose, Store, Action } from 'redux'
import { Subject } from 'rxjs';

import { asyncActionMatcher, statelyAsyncReducer, statelyAsyncMiddleware, AsyncSlice } from 'stately-async'
import { StatelyAsyncSymbol } from 'stately-async/AsyncState'
import { EventAPI, $toMiddleware, $toEvents } from 'stately-async/observables'

import { Async, AsyncController } from './Async'
import { Subscription, createStoreContext } from './Subscribable';

let StoreSubscription: Subscription<AsyncSlice, Action>
let StoreAsyncController: React.ComponentType

let clock: SinonFakeTimers
let eventAPI: EventAPI<Action>
let testStore: Store<AsyncSlice>

const operation = (p1: number, p2: string) => 
  new Promise<{ r1: number; r2: string }>(resolve => {
    setTimeout(() => resolve({ r1: p1 + 1, r2: p2.toLowerCase() }), 10)
  })

const TestComponent: React.SFC<{ p1: number, p2: string }> = ({ p1, p2 }) => (
  <StoreSubscription>
    <StoreAsyncController>
      <Async operation={operation} params={[p1, p2]}>
        {state => (
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
          </div>
        )}
      </Async>
    </StoreAsyncController>
  </StoreSubscription>
)

const isCompleteAction = asyncActionMatcher('complete')

describe('<Async>', () => {
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
    it('should immediately trigger the `effect` with the given `params`, and pass "active" effect state', () => {
      const wrapper = mount(<TestComponent p1={1} p2="PARAM" />)
      expect(wrapper).to.have.descendants('.loading')
    })
  })

  describe('`effect` yields data', () => {
    it('should pass the new data in the effect state', done => {
      const wrapper = mount(<TestComponent p1={1} p2="PARAM" />)
      eventAPI.one(
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

  describe('`params` prop changed', () => {
    it('should trigger the `effect`, and pass "active" effect state', done => {
      const wrapper = mount(<TestComponent p1={1} p2="PARAM" />)
      expect(wrapper).to.have.descendants('.loading')
      eventAPI.one(
        isCompleteAction,
        () => {
          wrapper.update()
          expect(wrapper.find('.r1')).to.have.text('2')
          expect(wrapper.find('.r2')).to.have.text('param')
          wrapper.setProps({ p1: 2, p2: 'OTHER' })
          wrapper.update()
          expect(wrapper).to.have.descendants('.loading')
          eventAPI.one(
            isCompleteAction,
            () => {
              wrapper.update()
              expect(wrapper.find('.r1')).to.have.text('3')
              expect(wrapper.find('.r2')).to.have.text('other')
              done()
            },
            done,
          )
          clock.next()
        },
        done,
      )
      clock.next()
    })
  })

  describe('unmount', () => {
    it('should remove the state from the state tree', () => {
      const wrapper = mount(<TestComponent p1={1} p2="PARAM" />)
      wrapper.unmount()
      expect(Object.keys(testStore.getState()[StatelyAsyncSymbol])).to.have.property('length', 0)
    })
  })
})
