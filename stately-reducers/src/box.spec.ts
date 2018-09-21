import * as chai from 'chai'
import 'mocha'
const { expect } = chai

import { Reducer, Store, createStore } from 'redux';

import box from './box'

interface OpenClosed {
  open: boolean
}

const toggleReducer: Reducer<OpenClosed> = (state = { open: false }, action) =>
  action.type === 'TOGGLE' ? { open: !state.open } : state

const boxedReducer = box({ openClosed: toggleReducer })

describe('box', () => {
  let store: Store<{ openClosed: OpenClosed }>
  beforeEach(() => {
    store = createStore(boxedReducer)
  })

  it('should convert `Reducer<S>` into `Reducer<{ boxName: S }>`', () => {
    store.dispatch({ type: 'TOGGLE' })
    expect(store.getState().openClosed).to.have.property('open', true)
  })
})
