/**
 * Defines the {@link AsyncAction} type, as well as the {@link asyncActionMatcher} and {@link asyncActionCreatorFactory} functions.
 * These functions and their implementation details are useful for advanced use cases.
 * In particular, `asyncActionMatcher` is useful when defining custom handling for `AsyncActions` with e.g. a reducer or middleware.
 */

/** @ignore */
import { Action } from './reduxlike'

import { StatelyAsyncSymbol } from './AsyncState'
import { AsyncOperation } from './AsyncOperation'

/** The type prefix applied to every {@link AsyncAction}. */
export const ACTION_PREFIX = 'stately-async'

/** A union type representing all of the possible suffix values for {@link AsyncAction#type}. */
export type AsyncPhase = 'call' | 'data' | 'error' | 'complete' | 'destroy'

/** Metadata appended to an {@link AsyncAction}, used by the reducer and middleware to handle the action. */
export interface AsyncLifecycleMeta {
  /** Function name of the {@link AsyncOperation}, e.g. `myFunction` */
  readonly name: string
  /** uuid for the owning {@link AsyncLifecycle} */
  readonly id: string
  /** {@link AsyncPhase}, e.g. `call` */
  readonly phase: AsyncPhase
}

/** A special type of action dispatched by this library, describing a state change in an {@link AsyncLifecycle}. */
export interface AsyncAction<Payload extends any[]> extends Action {
  readonly type: string
  readonly payload: Payload
  readonly [StatelyAsyncSymbol]: AsyncLifecycleMeta
}

/** Type guard to indicate whether a given action is an  {@link AsyncAction}. */
export const isAsyncAction = (action: Action): action is AsyncAction<any[]> =>
  StatelyAsyncSymbol in action

/**
 * Factory that creates a configurable type guard for filtering and differentiating {@link AsyncAction}s.
 * 
 * This function is useful to anyone who intends to define custom handling for `AsyncAction`s, such as:
 * - creating a custom reducer to update other parts of the state tree (keeping a historical record of requests?)
 * - creating a custom Epic, Saga, or other middleware to create asynchronous operation sequences (chain several `AsyncFunctions` serially?)
 * 
 * The returned guard will test a given action, returning true iff:
 * - the action is an `AsyncAction`
 * - no `type` is given, or the action's `saction` matches the given `type`
 * - no `operation` is given, or the action's `infix` matches the `name` of the given `operation`
 * 
 * See {@link createSessionActionCreator} for information about the internal structure of `AsyncAction`s.
 */
export function asyncActionMatcher<Data, Params extends any[]>(phase?: 'call', operation?: AsyncOperation<Data, Params>): (action: Action) => action is AsyncAction<Params>
export function asyncActionMatcher<Data, Params extends any[]>(phase?: 'data', operation?: AsyncOperation<Data, Params>): (action: Action) => action is AsyncAction<[Data]>
export function asyncActionMatcher<Data, Params extends any[]>(phase?: 'error', operation?: AsyncOperation<Data, Params>): (action: Action) => action is AsyncAction<[any]>
export function asyncActionMatcher<Data, Params extends any[]>(phase?: AsyncPhase, operation?: AsyncOperation<Data, Params>): (action: Action) => action is AsyncAction<[]>
export function asyncActionMatcher<Data, Params extends any[]>(phase?: AsyncPhase, operation?: AsyncOperation<Data, Params>) {
  return (action: Action) => 
    isAsyncAction(action) &&
    !!(!phase || action[StatelyAsyncSymbol].phase === phase) &&
    !!(!operation || (operation.name && operation.name === action[StatelyAsyncSymbol].name))
}

/** Factory that creates {@link AsyncAction} payload envelopes, preconfigured for a specific {@link AsyncOperation}, {@link AsyncLifecycle} instance, and {@link AsyncPhase}. */
export interface AsyncActionCreator<Payload extends any[]> {
  /** The call signature. Returns an  {@link AsyncAction} with this action creator's {@link AsyncActionMeta}. */
  (...payload: Payload): AsyncAction<Payload>
  /** Full type constant for actions created by this function, e.g. `stately-asnc/myFunction/call`. */
  readonly type: string
  /** Metadata for the owning {@link AsyncLifecycle}. */
  readonly meta: AsyncLifecycleMeta
  /**
   * Function that returns true iff the given action matches all properties of this action creator's {@link AsyncActionMeta}.
   * In practice, this can be used to detect actions dispatched for this specific operation and lifecycle event.
   */
  readonly match: (action: Action) => action is AsyncAction<Payload>
}

const getOperationName = <Data, Params extends any[]>(
  asyncOperation: AsyncOperation<Data, Params>,
  id: string,
) => {
  if (asyncOperation.name) {
    return asyncOperation.name
  } else {
    // tslint:disable-next-line:no-console
    console.warn(
      'stately-async:\n',
      'asyncLifecycle() was called with an anonymous AsyncOperation.\n',
      'The action type infix will fall back to the lifecycle\'s uuid, which is ugly and non-descriptive.\n',
      'This also means it will be impossible to use asyncActionMatchers() to create matchers for the given AsyncOperation.',
      'It is recommended that only non-anonymous AsyncOperations are used.',
    )
    return id
  }
}

/**
 * Internal factory function that builds an {@link AsyncActionCreator} with the given lifecycle metadata and {@link AsyncPhase}.
 * 
 * The function defines how {@link AsyncAction}s are created:
 * - how the action "type" strings are generated
 * - how an action payload is packaged
 * - how the lifecycle metadata is packaged
 * 
 * This information is useful to anyone who intends to define custom handling for `AsyncAction`s, such as:
 * - creating a custom reducer to update other parts of the state tree (keeping a historical record of requests?)
 * - creating a custom Epic, Saga, or other middleware to create side-effect sequences (chain several `AsyncFunctions` serially?)
 * 
 * The public function {@link asyncActionMatcher} can be used by reducers or middleware to recognize and filter `AsyncAction`s.
 */
export const asyncActionCreatorFactory = <Data, Params extends any[]>(
  operation: AsyncOperation<Data, Params>,
  id: string,
) => <Payload extends any[]>(
  phase: AsyncPhase,
): AsyncActionCreator<Payload> => {
  const name = getOperationName(operation, id)
  const type = `${ACTION_PREFIX}/${name}/${phase}`
  const meta = { id, name, phase }
  const actionCreator = (...payload: Payload) => ({
    type,
    payload,
    [StatelyAsyncSymbol]: meta,
  })
  const guard = asyncActionMatcher(phase)
  const match = (action: Action): action is AsyncAction<Payload> =>
    guard(action) && action[StatelyAsyncSymbol].id === id
  return Object.freeze(
    Object.assign(actionCreator, {
      type,
      meta,
      match
    }),
  )
}
