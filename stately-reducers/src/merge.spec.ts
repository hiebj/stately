import * as chai from 'chai'
import * as sinon from 'sinon'
import 'mocha'
const { expect } = chai

import { Reducer, Store, createStore } from 'redux';

import chain from './chain'
import box from './box'
import merge from './merge'

// ---- File: IsOpen.ts ----
interface IsOpen {
  open: boolean
}
const initialIsOpenState: IsOpen = { open: false }

const openReducer: Reducer<IsOpen> = (state = initialIsOpenState, action) =>
  action.type === 'CLOSE' ? { open: false } : state
const closeReducer: Reducer<IsOpen> = (state = initialIsOpenState, action) =>
  action.type === 'OPEN' ? { open: true } : state

const isOpenReducer: Reducer<IsOpen> = chain(
  openReducer,
  closeReducer,
)
const isOpenSliceReducer = box({ isOpen: isOpenReducer })

// ---- File: User.ts ----
interface User {
  id: number
  name: string
}
const initialUserState: User = {
  id: 0,
  name: ''
}
const changeIdReducer: Reducer<User> = (state = initialUserState, action) =>
  action.type === 'CHANGE_ID' ? { ...state, id: action.id } : state
const changeNameReducer: Reducer<User> = (state = initialUserState, action) =>
  action.type === 'CHANGE_NAME' ? { ...state, name: action.name } : state

const userReducer = chain(changeIdReducer, changeNameReducer)
const userSliceReducer = box({ user: userReducer })

// ---- File: store.ts ----
const composedReducer = merge(isOpenSliceReducer, userSliceReducer)
let store: Store<ReturnType<typeof composedReducer>>
// typeof store is now:
// Store<{
//   isOpen: { open: boolean },
//   user: { id: number, name: string }
// }>

describe('merge', () => {
  let warnSpy: sinon.SinonSpy
  beforeEach(() => {
    store = createStore(composedReducer)
    warnSpy = sinon.stub(console, 'warn')
  })

  afterEach(() => {
    warnSpy.restore()
  })

  it('should allow each of the given reducers to initialize their state independently', () => {
    expect(store.getState().isOpen).to.have.property('open', false)
    expect(store.getState().user).to.have.property('id', 0)
    expect(store.getState().user).to.have.property('name', '')
  })

  it('should call the first reducer', () => {
    store.dispatch({ type: 'OPEN' })
    expect(store.getState().isOpen).to.have.property('open', true)
    expect(warnSpy).not.to.have.been.called
  })

  it('should call the second reducer', () => {
    store.dispatch({ type: 'CHANGE_ID', id: 1 })
    expect(store.getState().user).to.have.property('id', 1)
    store.dispatch({ type: 'CHANGE_NAME', name: 'bob' })
    expect(store.getState().user).to.have.property('name', 'bob')
  })

  it('should warn to the console if destructive merge causes conflict when state is initialized', () => {
    const overwriteUserReducer: Reducer<{ user: User }> = () => ({
      user: {
        id: 5,
        name: 'other'
      }
    })
    const destructiveMergeReducer = merge(composedReducer, overwriteUserReducer)
    store = createStore(destructiveMergeReducer)
    expect(warnSpy).to.have.been.called
    store.dispatch({ type: null })
    expect(store.getState().user).to.have.property('id', 5)
  })
})
