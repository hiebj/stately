import { Reducer, AnyAction } from 'redux'

import { FxState, initialFxState, FxSlice } from './FxState'
import { isFxAction } from './actions'
import chainReducers from './chainReducers'
import { remove } from './cache'

const callReducer: Reducer<FxState<any, any>, AnyAction> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'call'
    ? {
        ...state,
        status: 'active',
        params: action.payload,
        data: null,
        error: null,
      }
    : state

const dataReducer: Reducer<FxState<any, any>, AnyAction> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'data'
    ? {
        ...state,
        data: action.payload[0],
        error: null,
      }
    : state

const errorReducer: Reducer<FxState<any, any>, AnyAction> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'error'
    ? {
        ...state,
        status: 'error',
        error: action.payload[0],
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

export const fxStateReducer = chainReducers(callReducer, dataReducer, errorReducer, completeReducer)

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
