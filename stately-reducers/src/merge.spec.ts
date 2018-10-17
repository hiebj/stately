import 'mocha'
import { expect } from 'chai'
import { stub } from 'sinon'

import { Reducer, Store, createStore } from 'redux';

import chain from './chain'
import box from './box'
import merge from './merge'

// ---- File: IsOpen.ts ----
interface IsOpen {
  open: boolean
}
const initialIsOpenState: IsOpen = { open: false }

// each reducer is "atomic" - it only handles one action and performs a single state mutation
const openReducer: Reducer<IsOpen> = (state = initialIsOpenState, action) =>
  action.type === 'CLOSE' ? { open: false } : state
const closeReducer: Reducer<IsOpen> = (state = initialIsOpenState, action) =>
  action.type === 'OPEN' ? { open: true } : state

const isOpenModelReducer: Reducer<IsOpen> = chain(openReducer, closeReducer)
const isOpenSliceReducer = box(isOpenModelReducer, 'isOpen')

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
  action.type === 'ID_SET' ? { ...state, id: action.id } : state
const changeNameReducer: Reducer<User> = (state = initialUserState, action) =>
  action.type === 'NAME_SET' ? { ...state, name: action.name } : state

const userModelReducer: Reducer<User> = chain(changeIdReducer, changeNameReducer)
const userSliceReducer = box(userModelReducer, 'user')

// ---- File: store.ts ----
const composedReducer = merge(isOpenSliceReducer, userSliceReducer)
let store: Store<ReturnType<typeof composedReducer>>
// store: Store<{
//   isOpen: { open: boolean },
//   user: { id: number, name: string }
// }>

describe('merge', () => {
  beforeEach(() => {
    const spy = stub(console, 'warn')
    store = createStore(composedReducer)
    expect(spy).not.to.have.been.called
    spy.restore()
  })

  it('should allow each of the given reducers to initialize their state independently', () => {
    expect(store.getState().isOpen).to.have.property('open', false)
    expect(store.getState().user).to.have.property('id', 0)
    expect(store.getState().user).to.have.property('name', '')
  })

  it('should call the first reducer', () => {
    store.dispatch({ type: 'OPEN' })
    expect(store.getState().isOpen).to.have.property('open', true)
  })

  it('should call the second reducer', () => {
    store.dispatch({ type: 'ID_SET', id: 1 })
    expect(store.getState().user).to.have.property('id', 1)
    store.dispatch({ type: 'NAME_SET', name: 'bob' })
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
    const spy = stub(console, 'warn')
    store = createStore(destructiveMergeReducer)
    expect(spy).to.have.been.called
    spy.restore()
    store.dispatch({ type: null })
    expect(store.getState().user).to.have.property('id', 5)
  })
})
