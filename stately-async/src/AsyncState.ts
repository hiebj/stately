/** Defines {@link AsyncState}, which represents the current state of an asynchronous operation. */

/** Symbol used as a namespace for stately-async data on public objects. */
export const StatelyAsyncSymbol = Symbol('stately-async')

/** The possible values for {@link AsyncState#status}. */
export type AsyncStateStatus = null | 'active' | 'error' | 'completed'

export interface InitialAsyncState {
  status: null
  params: null
  data: null
  error: null
}

export interface ActiveAsyncState<Data, Params> {
  status: 'active'
  params: null | Params
  data: null | Data
  error: null
}

export interface ErrorAsyncState<Data, Params> {
  status: 'error'
  params: null | Params
  data: null | Data
  error: unknown
}

export interface CompletedAsyncState<Data, Params> {
  status: 'completed'
  params: null | Params
  data: Data
  error: null
}

/**
 * The union type describing all possible states of an `AsyncState`.
 * The possible types for each field vary depending on `status`.
 * When collapsed, the type looks like:
 * ```
 * type AsyncState<Data, Params> = {
 *   status: null | 'active' | 'error' | 'completed'
 *   params: null | Params
 *   data: null | Data
 *   error: null | unknown
 * }
 * ```
 * Note that the type of `error` is `unknown` when it is not `null`.
 * That is because, in JavaScript, a `throw` statement can throw a value of any type.
 * As such, the type of `error` cannot be inferred.
 * It must be narrowed using type guards before it can be used.
 */
export type AsyncState<Data, Params = undefined> =
  | InitialAsyncState
  | ActiveAsyncState<Data, Params>
  | ErrorAsyncState<Data, Params>
  | CompletedAsyncState<Data, Params>

export const initialAsyncState = Object.freeze({
  status: null,
  params: null,
  data: null,
  error: null,
}) as InitialAsyncState

/**
 * The {@link statelyAsyncReducer} manages a map of `<uuid, AsyncState>` under the `StatelyAsyncSymbol` in the root of the state tree.
 * By integrating the reducer into your Store, the root state of the state tree will satisfy this interface.
 */
export interface AsyncSlice {
  [StatelyAsyncSymbol]: { [key: string]: AsyncState<any, any> }
}
