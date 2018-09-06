export interface InitialFxState {
  status: null
  params: null
  data: null
  error: null
}

export interface ActiveFxState<Data, Params> {
  status: 'active'
  params: null | Params
  data: null | Data
  error: null
}

export interface ErrorFxState<Data, Params> {
  status: 'error'
  params: null | Params
  data: null | Data
  error: any
}

export interface CompletedFxState<Data, Params> {
  status: 'completed'
  params: null | Params
  data: Data
  error: null
}

/**
 * The union type describing all possible states of an `Effect`.
 * The possible types for each field vary depending on `status`.
 * When collapsed, the type looks like:
 * ```
 * type FxState<Data, Params> = {
 *   status: null | 'active' | 'error' | 'completed'
 *   params: null | Params
 *   data: null | Data
 *   error: null | any
 * }
 * ```
 */
export type FxState<Data, Params = undefined> =
  | InitialFxState
  | ActiveFxState<Data, Params>
  | ErrorFxState<Data, Params>
  | CompletedFxState<Data, Params>

export const initialFxState = Object.freeze({
  status: null,
  params: null,
  data: null,
  error: null,
}) as InitialFxState

/**
 * A "slice" of a root state object, as managed by e.g. a Redux Store.
 * The `fxReducer` manages a map of `<uuid, FxState>` under the slice name `fx` in the root state.
 */
export interface FxSlice {
  fx: { [key: string]: FxState<any, any> }
}
