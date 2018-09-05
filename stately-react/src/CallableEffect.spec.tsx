import * as React from 'react'
import { createStore, compose, applyMiddleware, Store, AnyAction } from 'redux'
import { Provider } from 'react-redux'
import { fxReducer, fxMiddleware, FxSlice } from 'fx-state'
import { FxActionType, isFxAction } from 'fx-state/actions'

import * as chai from 'chai'
import { SinonFakeTimers, useFakeTimers } from 'sinon'
import { mount } from 'enzyme'
import 'mocha'
const expect = chai.expect

import { ContextCallableEffect } from './CallableEffect'
import { AddTestActionListener, testMiddleware } from './middleware.spec'

let clock: SinonFakeTimers
let testStore: Store<FxSlice>
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

const isFxActionOfType = (type: FxActionType) => (action: AnyAction) =>
  isFxAction(action) && action.fx.fxType === type

const isCompleteAction = isFxActionOfType('complete')

describe('<CallableEffect>', () => {
  beforeEach(() => {
    clock = useFakeTimers()
    const { onNext: on, middleware } = testMiddleware()
    onNext = on
    testStore = createStore(
      fxReducer,
      compose(
        applyMiddleware(fxMiddleware),
        applyMiddleware(middleware),
      ),
    )
  })

  afterEach(() => {
    clock.restore()
  })

  it('should not render spinner or response data initially', () => {
    const wrapper = mount(<TestApp />)
    expect(wrapper).not.to.have.descendants('.loading')
    expect(wrapper).not.to.have.descendants('.r1')
    expect(wrapper).not.to.have.descendants('.r2')
  })

  it('should dispatch a `call` action and render spinner on click', () => {
    const wrapper = mount(<TestApp />)
    wrapper.find('button').simulate('click')
    expect(wrapper).to.have.descendants('.loading')
  })

  it('should render data when effect resolves and store updates', done => {
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

  it('should destroy the state when the component unmounts', () => {
    const wrapper = mount(<TestApp />)
    wrapper.find('button').simulate('click')
    wrapper.unmount()
    expect(Object.keys(testStore.getState().fx)).to.have.property('length', 0)
  })
})
