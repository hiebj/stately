import * as React from 'react'
import { createStore, compose, applyMiddleware, Store } from 'redux'
import { Provider } from 'react-redux'

import { asyncActionMatcher, statelyAsyncReducer, statelyAsyncMiddleware, AsyncSessionSlice } from 'stately-async'
import { StatelyAsyncSymbol } from 'stately-async/AsyncSession'
import { AddTestActionListener, action$Middleware, onNext as $onNext } from 'stately-async/middleware'

import * as chai from 'chai'
import { SinonFakeTimers, useFakeTimers } from 'sinon'
import { mount } from 'enzyme'
import 'mocha'
const { expect } = chai

import { ContextCallableEffect } from './CallableEffect'

let clock: SinonFakeTimers
let testStore: Store<AsyncSessionSlice>
let onNext: AddTestActionListener

const effect = (p1: number, p2: string) =>
  new Promise<{ r1: number; r2: string }>(resolve => {
    setTimeout(() => resolve({ r1: p1 + 1, r2: p2.toLowerCase() }), 10)
  })

const TestApp: React.SFC = () => (
  <Provider store={testStore}>
    <ContextCallableEffect effect={effect}>
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
            onClick={() => {
              call(1, 'PARAM')
            }}
          />
        </div>
      )}
    </ContextCallableEffect>
  </Provider>
)

const isCompleteAction = asyncActionMatcher('complete')

describe('<CallableEffect>', () => {
  beforeEach(() => {
    clock = useFakeTimers()
    const { action$, middleware } = action$Middleware()
    onNext = $onNext(action$)
    testStore = createStore(
      statelyAsyncReducer,
      compose(
        applyMiddleware(statelyAsyncMiddleware),
        applyMiddleware(middleware),
      ),
    )
  })

  afterEach(() => {
    clock.restore()
  })

  describe('mount', () => {
    it('should pass initial effect state', () => {
      const wrapper = mount(<TestApp />)
      expect(wrapper).not.to.have.descendants('.loading')
      expect(wrapper).not.to.have.descendants('.r1')
      expect(wrapper).not.to.have.descendants('.r2')
    })
  })

  describe('call hook', () => {
    it('should trigger the given `effect` and pass "active" effect state', () => {
      const wrapper = mount(<TestApp />)
      wrapper.find('button').simulate('click')
      expect(wrapper).to.have.descendants('.loading')
    })
  })

  describe('`effect` yields data', () => {
    it('should pass the new data in the effect state', done => {
      const wrapper = mount(<TestApp />)
      wrapper.find('button').simulate('click')
      onNext(
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

  describe('unmount', () => {
    it('should remove the effect state from the state tree', () => {
      const wrapper = mount(<TestApp />)
      wrapper.find('button').simulate('click')
      wrapper.unmount()
      expect(Object.keys(testStore.getState()[StatelyAsyncSymbol])).to.have.property('length', 0)
    })
  })
})
