import * as React from 'react'
import { createStore, applyMiddleware, compose, Store } from 'redux'
import { Provider } from 'react-redux'

import { asyncActionMatcher, statelyAsyncReducer, statelyAsyncMiddleware, AsyncSessionSlice } from 'stately-async'
import { StatelyAsyncSymbol } from 'stately-async/AsyncSession'
import { AddTestActionListener, action$Middleware, onNext as $onNext } from 'stately-async/middleware'

import * as chai from 'chai'
import { SinonFakeTimers, useFakeTimers } from 'sinon'
import { mount } from 'enzyme'
import 'mocha'
const { expect } = chai

import { ContextDeclarativeEffect } from './DeclarativeEffect'

let clock: SinonFakeTimers
let testStore: Store<AsyncSessionSlice>
let onNext: AddTestActionListener

const effect = (p1: number, p2: string) =>
  new Promise<{ r1: number; r2: string }>(resolve => {
    setTimeout(() => resolve({ r1: p1 + 1, r2: p2.toLowerCase() }), 10)
  })

// TODO with literal tuple type inference, you would not need to cast params.
// https://github.com/Microsoft/TypeScript/issues/24350
const TestApp: React.SFC<{ params: [number, string] }> = ({ params }) => (
  <Provider store={testStore}>
    <ContextDeclarativeEffect effect={effect} params={params}>
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
    </ContextDeclarativeEffect>
  </Provider>
)

const isCompleteAction = asyncActionMatcher('complete')

describe('<DeclarativeEffect>', () => {
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
    it('should immediately trigger the `effect` with the given `params`, and pass "active" effect state', () => {
      const wrapper = mount(<TestApp params={[1, 'PARAM']} />)
      expect(wrapper).to.have.descendants('.loading')
    })
  })

  describe('`effect` yields data', () => {
    it('should pass the new data in the effect state', done => {
      const wrapper = mount(<TestApp params={[1, 'PARAM']} />)
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

  describe('`params` prop changed', () => {
    it('should trigger the `effect`, and pass "active" effect state', done => {
      const wrapper = mount(<TestApp params={[1, 'PARAM']} />)
      expect(wrapper).to.have.descendants('.loading')
      onNext(
        isCompleteAction,
        () => {
          wrapper.update()
          expect(wrapper.find('.r1')).to.have.text('2')
          expect(wrapper.find('.r2')).to.have.text('param')
          wrapper.setProps({ params: [2, 'OTHER'] })
          wrapper.update()
          expect(wrapper).to.have.descendants('.loading')
          onNext(
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
      const wrapper = mount(<TestApp params={[1, 'PARAM']} />)
      wrapper.unmount()
      expect(Object.keys(testStore.getState()[StatelyAsyncSymbol])).to.have.property('length', 0)
    })
  })
})
