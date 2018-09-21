import * as chai from 'chai'
import 'mocha'
const { expect } = chai

import { Reducer, Store, createStore } from 'redux';

import chain from './chain'

interface IsOpen {
  open: boolean | null
}

const openReducer: Reducer<IsOpen> = (state = { open: false }, action) =>
  action.type === 'CLOSE' ? { open: false } : state
const closeReducer: Reducer<IsOpen> = (state = { open: true }, action) =>
  action.type === 'OPEN' ? { open: true } : state
const identity = (x: any) => x
const nthReducer: Reducer<IsOpen> = (state = { open: null }, action) =>
  action.type === 'N' ? { open: null } : state

const composedReducer: Reducer<IsOpen> = chain(
  identity, // does not initialize state (which, technically, means it is not a valid Redux reducer)
  openReducer, // initializes state to { open: false }
  closeReducer,
  identity,
  identity,
  identity,
  identity,
  nthReducer
)

describe('chain', () => {
  let store: Store<IsOpen>
  beforeEach(() => {
    store = createStore(composedReducer)
  })

  it('should initialize the state with the first reducer that returns a non-undefined value', () => {
    expect(store.getState()).to.have.property('open', false)
  })

  it('should call the first reducer', () => {
    store.dispatch({ type: 'OPEN' })
    expect(store.getState()).to.have.property('open', true)
  })

  it('should call the second reducer', () => {
    store.dispatch({ type: 'OPEN' })
    store.dispatch({ type: 'CLOSE' })
    expect(store.getState()).to.have.property('open', false)
  })

  it('should call the nth reducer', () => {
    store.dispatch({ type: 'N' })
    expect(store.getState()).to.have.property('open', null)
  })
})
