/** @module stately-async */
import { Reducer, Action } from 'redux'
import { chain } from 'stately-reducers'

import { AsyncState, initialAsyncState, AsyncSlice } from './AsyncState'
import { isAsyncAction } from './actions'
import { remove } from './cache'
import { StatelyAsyncSymbol } from './AsyncState'

const callReducer: Reducer<AsyncState<any, any>, Action> = (state = initialAsyncState, action) =>
  isAsyncAction(action) && action[StatelyAsyncSymbol].phase === 'call'
    ? {
        ...state,
        status: 'active',
        params: action.payload,
        data: null,
        error: null,
      }
    : state

const dataReducer: Reducer<AsyncState<any, any>, Action> = (state = initialAsyncState, action) =>
  isAsyncAction(action) && action[StatelyAsyncSymbol].phase === 'data'
    ? {
        ...state,
        data: action.payload[0],
        error: null,
      }
    : state

const errorReducer: Reducer<AsyncState<any, any>, Action> = (state = initialAsyncState, action) =>
  isAsyncAction(action) && action[StatelyAsyncSymbol].phase === 'error'
    ? {
        ...state,
        status: 'error',
        error: action.payload[0],
      }
    : state

const completeReducer: Reducer<AsyncState<any, any>, Action> = (state = initialAsyncState, action) =>
  isAsyncAction(action) && action[StatelyAsyncSymbol].phase === 'reset'
    ? initialAsyncState
    : state

const resetReducer: Reducer<AsyncState<any, any>, Action> = (state = initialAsyncState, action) =>
    isAsyncAction(action) && action[StatelyAsyncSymbol].phase === 'complete'
      ? {
          ...state,
          status: 'completed',
          error: null,
        }
      : state

/**
 * A reducer that handles {@link AsyncAction}s and updates the corresponding {@link AsyncState}.
 * It is called by {@link statelyAsyncReducer}. Generally, you should not have to use this reducer directly.
 */
export const asyncStateReducer = chain(callReducer, dataReducer, errorReducer, completeReducer, resetReducer)

/**
 * A reducer that manages the {@link AsyncSlice} in the root of a state tree.
 * It maps actions by their uuid to individual {@link AsyncLifecycle} instances.
 * This reducer must be integrated into your Store for the library to work.
 * It is aliased and exported as {@link statelyAsyncReducer} from the library's `index`.
 */
export const statelyAsyncReducer: Reducer<AsyncSlice> = (state = { [StatelyAsyncSymbol]: {} }, action) => {
  if (isAsyncAction(action)) {
    const sid = action[StatelyAsyncSymbol].id
    const nextState = { ...state, [StatelyAsyncSymbol]: { ...state[StatelyAsyncSymbol] } }
    if (action[StatelyAsyncSymbol].phase === 'destroy') {
      delete nextState[StatelyAsyncSymbol][sid]
      remove(sid)
    } else {
      nextState[StatelyAsyncSymbol][sid] = asyncStateReducer(nextState[StatelyAsyncSymbol][sid], action)
    }
    return nextState
  }
  return state
}
