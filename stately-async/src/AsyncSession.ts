/** Defines {@link AsyncSession}, which represents the current state of an asynchronous operation. */

/** Symbol used as a namespace for stately-async data on public objects. */
export const StatelyAsyncSymbol = Symbol('stately-async')

/** The possible values for {@link AsyncSession}#status. */
export type AsyncSessionStatus = null | 'active' | 'error' | 'completed'

export interface InitialAsyncSession {
  status: null
  params: null
  data: null
  error: null
}

export interface ActiveAsyncSession<Data, Params> {
  status: 'active'
  params: null | Params
  data: null | Data
  error: null
}

export interface ErrorAsyncSession<Data, Params> {
  status: 'error'
  params: null | Params
  data: null | Data
  error: unknown
}

export interface CompletedAsyncSession<Data, Params> {
  status: 'completed'
  params: null | Params
  data: Data
  error: null
}

/**
 * The union type describing all possible states of an `AsyncSession`.
 * The possible types for each field vary depending on `status`.
 * When collapsed, the type looks like:
 * ```
 * type AsyncSession<Data, Params> = {
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
export type AsyncSession<Data, Params = undefined> =
  | InitialAsyncSession
  | ActiveAsyncSession<Data, Params>
  | ErrorAsyncSession<Data, Params>
  | CompletedAsyncSession<Data, Params>

export const initialAsyncSession = Object.freeze({
  status: null,
  params: null,
  data: null,
  error: null,
}) as InitialAsyncSession

/**
 * The {@link statelyAsyncReducer} manages a map of `<uuid, AsyncSession>` under the `StatelyAsyncSymbol` in the root of the state tree.
 * By integrating the reducer into your Store, the root state of the state tree will satisfy this interface.
 */
export interface AsyncSessionSlice {
  [StatelyAsyncSymbol]: { [key: string]: AsyncSession<any, any> }
}
