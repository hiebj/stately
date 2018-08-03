import { Reducer, AnyAction } from 'redux'

import { FxState, initialFxState, FxSlice } from './FxState'
import { isFxAction } from './actions'
import reduceReducers from './reduceReducers'
import { get, remove } from './cache'

const subscribeReducer: Reducer<FxState<any, any>, AnyAction> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'subscribe'
    ? {
        ...state,
        status: 'active',
        params: action.payload || null,
        data: null,
        error: null,
      }
    : state

const nextReducer: Reducer<FxState<any, any>, AnyAction> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'next'
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

const unsubscribeReducer: Reducer<FxState<any, any>, AnyAction> = (
  state = initialFxState,
  action,
) => (isFxAction(action) && action.fx.fxType === 'unsubscribe' ? initialFxState : state)

export const fxStateReducer = reduceReducers(
  subscribeReducer,
  nextReducer,
  errorReducer,
  completeReducer,
  unsubscribeReducer,
)

export const fxSliceReducer: Reducer<FxSlice> = (state = { fx: {} }, action) => {
  if (isFxAction(action)) {
    const id = action.fx.id
    if (!!get(id)) {
      const nextState = { ...state, fx: { ...state.fx } }
      if (action.fx.fxType === 'destroy') {
        delete nextState.fx[id]
        remove(id)
      } else {
        nextState.fx[id] = fxStateReducer(nextState.fx[id], action)
      }
      return nextState
    } else {
      // tslint:disable-next-line:no-console
      console.error(
        'fx-state:\n',
        'An FxAction was dispatched with a uuid that could not be found.\n',
        'It is likely that the `destroy()` action for this uuid has already been dispatched, or the action was created by something other than an FxActionCreators instance.\n',
        'Only non-destroyed actions created by an FxActionCreators instance can be managed by FxState. This action will be ignored.\n',
        action,
      )
    }
  }
  return state
}

// TODO WeakMap reducer? what if there is no slice? what if there is no redux?

export { fxSliceReducer as fxReducer }
