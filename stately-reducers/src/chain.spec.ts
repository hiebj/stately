import 'mocha'
import { expect } from 'chai'

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

  it('should allow the first reducer that returns a non-undefined value to initialize state', () => {
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

  it('should return a distinct reference rather than clobbering the current one', () => {
    store.dispatch({ type: 'OPEN' })
    const lastState = store.getState()
    store.dispatch({ type: 'N' })
    expect(store.getState()).not.to.equal(lastState)
  })
})
