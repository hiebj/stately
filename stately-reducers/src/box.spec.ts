import 'mocha'
import { expect } from 'chai'

import { Reducer, Store, createStore } from 'redux';

import box from './box'

interface IsOpen {
  open: boolean
}

const toggleReducer: Reducer<IsOpen> = (state = { open: false }, action) =>
  action.type === 'TOGGLE' ? { open: !state.open } : state

const boxedReducer = box(toggleReducer, 'isOpen')

describe('box', () => {
  let store: Store<ReturnType<typeof boxedReducer>>
  beforeEach(() => {
    store = createStore(boxedReducer)
  })

  it('box(Reducer<A>, key) => Reducer<{ [key]: A }>', () => {
    store.dispatch({ type: 'TOGGLE' })
    expect(store.getState().isOpen).to.have.property('open', true)
  })
})
