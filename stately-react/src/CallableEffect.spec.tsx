import * as React from 'react'
import { createStore, applyMiddleware, Store } from 'redux'
import { Provider } from 'react-redux'
import { fxReducer, fxMiddleware, FxSlice } from 'fx-state'
import * as chai from 'chai'
import { SinonSandbox, createSandbox } from 'sinon'
import { mount } from 'enzyme'
import 'mocha'
const expect = chai.expect

import { CallableEffect } from './CallableEffect'

let sandbox: SinonSandbox
let testStore: Store<FxSlice>

const effect = (p1: number, p2: string) =>
  new Promise<{ r1: number; r2: string }>(resolve => {
    setTimeout(() => resolve({ r1: p1 + 1, r2: p2.toLowerCase() }), 10)
  })

const TestApp: React.SFC = () => (
  <Provider store={testStore}>
    <CallableEffect effect={effect}>
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
    </CallableEffect>
  </Provider>
)

beforeEach(() => {
  sandbox = createSandbox({ useFakeTimers: true })
  testStore = createStore(fxReducer, applyMiddleware(fxMiddleware))
})

afterEach(() => {
  sandbox.restore()
})

describe('<CallableEffect>', () => {
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
    const unsubscribe = testStore.subscribe(() => {
      unsubscribe()
      wrapper.update()
      expect(wrapper).to.have.descendants('.r1')
      expect(wrapper).to.have.descendants('.r2')
      expect(wrapper.find('.r1')).to.have.text('2')
      expect(wrapper.find('.r2')).to.have.text('param')
      done()
    })
    sandbox.clock.next()
  })

  it('should destroy the state when the component unmounts', () => {
    const wrapper = mount(<TestApp />)
    wrapper.find('button').simulate('click')
    wrapper.unmount()
    expect(Object.keys(testStore.getState().fx)).to.to.property('length', 0)
  })
})
