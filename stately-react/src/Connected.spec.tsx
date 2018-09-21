import * as React from 'react'
import * as chai from 'chai'
import { createStore, Reducer } from 'redux'
import { Provider } from 'react-redux'
import { spy } from 'sinon'
import { shallow, mount } from 'enzyme'
import 'mocha'
const { expect } = chai

import { Connected, ContextConnected } from './Connected'

interface State {
  person: {
    first: string
    last: string
  }
}

interface Derived {
  firstAndLast: string
}

const initialState = { person: { first: 'john', last: 'smith' } }
let testReducerSpy: () => void
const testReducer: Reducer<State> = (s = initialState, a) =>
  a.type === 'CONNECTED_TEST' ? testReducerSpy() || s : s
const store = createStore(testReducer)

describe('<Connected>', () => {
  describe('basic store integration', () => {
    const wrapper = shallow(
      <Connected store={store}>
        {s => (
          <div>
            <span className="test">{s.person.first}</span>
          </div>
        )}
      </Connected>,
    )

    it('should pass the root state from the given store to the `children` render-prop', () => {
      expect(wrapper).to.contain(<span className="test">john</span>)
    })
  })

  describe('derived state integration', () => {
    const wrapper = shallow(
      // TODO this sucks. why can't TypeScript infer the type of Derived from the given deriveState?
      <Connected<State, Derived>
        store={store}
        deriveState={s => ({ firstAndLast: `${s.person.last}, ${s.person.first}` })}
      >
        {s => (
          <div>
            <span className="test">{s.firstAndLast}</span>
          </div>
        )}
      </Connected>,
    )

    it('should use `deriveState` to transform the root state, and pass the result to the `children` render-prop', () => {
      expect(wrapper).to.contain(<span className="test">smith, john</span>)
    })
  })

  describe('dispatch hook', () => {
    const wrapper = shallow(
      <Connected store={store}>
        {(s, d) => <button onClick={() => d({ type: 'CONNECTED_TEST' })}>{s.person.first}</button>}
      </Connected>,
    )

    beforeEach(() => {
      testReducerSpy = spy()
    })

    it('should dispatch actions on the given store', () => {
      expect(testReducerSpy).not.to.have.been.called
      wrapper.simulate('click')
      expect(testReducerSpy).to.have.been.called
    })
  })

  describe('<ContextConnected>', () => {
    const wrapper = mount(
      <Provider store={store}>
        <ContextConnected<State>>
          {s => (
            <div>
              <span className="test">{s.person.first}</span>
            </div>
          )}
        </ContextConnected>
      </Provider>,
    )

    it('should pull a `store` off React 15 context and pass it through', () => {
      expect(wrapper).to.contain(<span className="test">john</span>)
    })
  })
})
