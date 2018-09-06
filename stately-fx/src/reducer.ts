import { Reducer, Action } from 'redux'

import { FxState, initialFxState, FxSlice } from './FxState'
import { isFxAction } from './actions'
import chainReducers from './chainReducers'
import { remove } from './cache'

const callReducer: Reducer<FxState<any, any>, Action> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'call'
    ? {
        ...state,
        status: 'active',
        params: action.payload,
        data: null,
        error: null,
      }
    : state

const dataReducer: Reducer<FxState<any, any>, Action> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'data'
    ? {
        ...state,
        data: action.payload[0],
        error: null,
      }
    : state

const errorReducer: Reducer<FxState<any, any>, Action> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'error'
    ? {
        ...state,
        status: 'error',
        error: action.payload[0],
      }
    : state

const completeReducer: Reducer<FxState<any, any>, Action> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'complete'
    ? {
        ...state,
        status: 'completed',
        error: null,
      }
    : state

/**
 * A reducer that handles `FxAction`s for a single `FxActionCreators` instance.
 * In other words, this reducer manages the `FxState` that is returned by `FxActionCreators#selector`.
 * It is called by `fxSliceReducer`. Generally you should not have to integrate this reducer into your store directly. 
 */
export const fxStateReducer = chainReducers(callReducer, dataReducer, errorReducer, completeReducer)

/**
 * A reducer that manages the `FxSlice` in the root state of a state tree.
 * It maps actions by their uuid to individual `FxState` instances.
 * This reducer must be integrated into your store for the library to work.
 * It is aliased and exported as `fxReducer` from the library's `index`.
 */
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
