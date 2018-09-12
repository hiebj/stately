/** Defines {@link statelyAsyncReducer}. */

/** @ignore */
import { Reducer, Action } from 'redux'

import { AsyncSession, initialAsyncSession, AsyncSessionSlice } from './AsyncSession'
import { isAsyncSessionAction } from './actions'
import chainReducers from './chainReducers'
import { remove } from './cache'
import { StatelyAsyncSymbol } from './AsyncSession'

const callReducer: Reducer<AsyncSession<any, any>, Action> = (state = initialAsyncSession, action) =>
  isAsyncSessionAction(action) && action[StatelyAsyncSymbol].saction === 'call'
    ? {
        ...state,
        status: 'active',
        params: action.payload,
        data: null,
        error: null,
      }
    : state

const dataReducer: Reducer<AsyncSession<any, any>, Action> = (state = initialAsyncSession, action) =>
  isAsyncSessionAction(action) && action[StatelyAsyncSymbol].saction === 'data'
    ? {
        ...state,
        data: action.payload[0],
        error: null,
      }
    : state

const errorReducer: Reducer<AsyncSession<any, any>, Action> = (state = initialAsyncSession, action) =>
  isAsyncSessionAction(action) && action[StatelyAsyncSymbol].saction === 'error'
    ? {
        ...state,
        status: 'error',
        error: action.payload[0],
      }
    : state

const completeReducer: Reducer<AsyncSession<any, any>, Action> = (state = initialAsyncSession, action) =>
  isAsyncSessionAction(action) && action[StatelyAsyncSymbol].saction === 'complete'
    ? {
        ...state,
        status: 'completed',
        error: null,
      }
    : state

/**
 * A reducer that handles {@link AsyncSessionAction}s and updates the corresponding {@link AsyncSession}.
 * It is called by {@link statelyAsyncReducer}. Generally, you should not have to use this reducer directly.
 */
export const asyncSessionReducer = chainReducers(callReducer, dataReducer, errorReducer, completeReducer)

/**
 * A reducer that manages the {@link AsyncSessionSlice} in the root of a state tree.
 * It maps actions by their uuid to individual {@link AsyncSession} instances.
 * This reducer must be integrated into your Store for the library to work.
 * It is aliased and exported as {@link statelyAsyncReducer} from the library's `index`.
 */
export const statelyAsyncReducer: Reducer<AsyncSessionSlice> = (state = { [StatelyAsyncSymbol]: {} }, action) => {
  if (isAsyncSessionAction(action)) {
    const sid = action[StatelyAsyncSymbol].sid
    const nextState = { ...state, [StatelyAsyncSymbol]: { ...state[StatelyAsyncSymbol] } }
    if (action[StatelyAsyncSymbol].saction === 'destroy') {
      delete nextState[StatelyAsyncSymbol][sid]
      remove(sid)
    } else {
      nextState[StatelyAsyncSymbol][sid] = asyncSessionReducer(nextState[StatelyAsyncSymbol][sid], action)
    }
    return nextState
  }
  return state
}
