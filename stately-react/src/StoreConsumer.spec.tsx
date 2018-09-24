import 'mocha'
import { expect } from 'chai'
import { spy } from 'sinon'
import { shallow, mount } from 'enzyme'

import * as React from 'react'
import { createStore, Reducer } from 'redux'
import { Provider } from 'react-redux'

import { StoreConsumer } from './StoreConsumer'
import { LegacyStoreConsumer } from './LegacyStoreConsumer'

interface State {
  person: {
    first: string
    last: string
  }
}

const initialState = { person: { first: 'john', last: 'smith' } }
let testReducerSpy: () => void
const testReducer: Reducer<State> = (s = initialState, a) =>
  a.type === 'CONNECTED_TEST' ? testReducerSpy() || s : s
const store = createStore(testReducer)

describe('<StoreConsumer>', () => {
  describe('basic store integration', () => {
    const wrapper = shallow(
      <StoreConsumer store={store}>
        {s => (
          <div>
            <span className="test">{s.person.first}</span>
          </div>
        )}
      </StoreConsumer>,
    )

    it('should pass the root state from the given store to the `children` render-prop', () => {
      expect(wrapper).to.contain(<span className="test">john</span>)
    })
  })

  describe('dispatch hook', () => {
    const wrapper = shallow(
      <StoreConsumer store={store}>
        {(s, d) => <button onClick={() => d({ type: 'CONNECTED_TEST' })}>{s.person.first}</button>}
      </StoreConsumer>,
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

  describe('<LegacyStoreConsumer>', () => {
    const wrapper = mount(
      <Provider store={store}>
        <LegacyStoreConsumer<State>>
          {s => (
            <div>
              <span className="test">{s.person.first}</span>
            </div>
          )}
        </LegacyStoreConsumer>
      </Provider>,
    )

    it('should pull a `store` off React 15 context and pass it through', () => {
      expect(wrapper).to.contain(<span className="test">john</span>)
    })
  })
})
