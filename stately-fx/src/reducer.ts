import { Reducer, AnyAction } from 'redux'

import { FxState, initialFxState, FxSlice } from './FxState'
import { isFxAction } from './actions'
import chainReducers from './chainReducers'
import { remove } from './cache'

const subscribeReducer: Reducer<FxState<any, any>, AnyAction> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'call'
    ? {
        ...state,
        status: 'active',
        params: action.payload || null,
        data: null,
        error: null,
      }
    : state

const nextReducer: Reducer<FxState<any, any>, AnyAction> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'data'
    ? {
        ...state,
        data: action.payload,
        error: null,
      }
    : state

const errorReducer: Reducer<FxState<any, any>, AnyAction> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'error'
    ? {
        ...state,
        status: 'error',
        error: action.payload,
      }
    : state

const completeReducer: Reducer<FxState<any, any>, AnyAction> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'complete'
    ? {
        ...state,
        status: 'completed',
        error: null,
      }
    : state

export const fxStateReducer = chainReducers(
  subscribeReducer,
  nextReducer,
  errorReducer,
  completeReducer,
)

export const fxSliceReducer: Reducer<FxSlice> = (state = { fx: {} }, action) => {
  if (isFxAction(action)) {
    const id = action.fx.id
    const nextState = { ...state, fx: { ...state.fx } }
    if (action.fx.fxType === 'destroy') {
      delete nextState.fx[id]
      remove(id)
    } else {
      nextState.fx[id] = fxStateReducer(nextState.fx[id], action)
    }
    return nextState
  }
  return state
}

// TODO WeakMap reducer? what if there is no slice? what if there is no redux?

export { fxSliceReducer as fxReducer }
