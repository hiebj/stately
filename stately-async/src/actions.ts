/** Defines the {@link asyncActionMatcher} and {@link asyncActionCreatorFactory} functions */

/** @ignore */
import { Action } from 'redux'

import { StatelyAsyncSymbol } from './AsyncState'
import { AsyncOperation } from './AsyncOperation'

/** The type prefix applied to every {@link AsyncAction}. */
export const ACTION_PREFIX = 'stately-async'

/** A union type representing all of the possible suffix values for {@link AsyncAction#type}. */
export type AsyncLifecycleEvent = 'call' | 'data' | 'error' | 'complete' | 'destroy'

/** Metadata appended to an {@link AsyncAction}, used by the reducer and middleware to handle the action. */
export interface AsyncActionMeta {
  /** uuid for the owning {@link AsyncLifecycle} */
  readonly id: string
  /** {@link AsyncLifecycleEvent}, e.g. `call` */
  readonly lifecycleEvent: AsyncLifecycleEvent
  /** Infix derived from the {@link AsyncOperation} function name, e.g. `myFunction` */
  readonly infix: string
}

/** A special type of action dispatched by this library, describing a state change in an {@link AsyncLifecycle}. */
export interface AsyncAction<Payload extends any[]> extends Action {
  readonly type: string
  readonly payload: Payload
  readonly [StatelyAsyncSymbol]: AsyncActionMeta
}

/** Type guard to indicate whether a given action is an  {@link AsyncAction}. */
export const isAsyncAction = (action: Action): action is AsyncAction<any[]> =>
  StatelyAsyncSymbol in action

/**
 * Factory that will create a configurable type guard.
 * 
 * This function is useful to anyone who intends to define custom handling for {@link AsyncAction}s, such as:
 * - creating a custom reducer to update other parts of the state tree (keeping a historical record of requests?)
 * - creating a custom Epic, Saga, or other middleware to create side-effect sequences (chain several `AsyncFunctions` serially?)
 * 
 * The returned guard will test a given action, returning true iff:
 * - the action is an `AsyncAction`
 * - no `type` is given, or the action's `saction` matches the given `type`
 * - no `operation` is given, or the action's `infix` matches the `name` of the given `operation`
 * 
 * See {@link createSessionActionCreator} for information about the internal structure of `AsyncAction`s.
 */
export function asyncActionMatcher<Data, Params extends any[]>(type?: 'call', operation?: AsyncOperation<Data, Params>): (action: Action) => action is AsyncAction<Params>
export function asyncActionMatcher<Data, Params extends any[]>(type?: 'data', operation?: AsyncOperation<Data, Params>): (action: Action) => action is AsyncAction<[Data]>
export function asyncActionMatcher<Data, Params extends any[]>(type?: 'error', operation?: AsyncOperation<Data, Params>): (action: Action) => action is AsyncAction<[any]>
export function asyncActionMatcher<Data, Params extends any[]>(type?: AsyncLifecycleEvent, operation?: AsyncOperation<Data, Params>): (action: Action) => action is AsyncAction<[]>
export function asyncActionMatcher<Data, Params extends any[]>(type?: AsyncLifecycleEvent, operation?: AsyncOperation<Data, Params>) {
  return (action: Action) => 
    isAsyncAction(action) &&
    !!(!type || action[StatelyAsyncSymbol].lifecycleEvent === type) &&
    !!(!operation || (operation.name && operation.name === action[StatelyAsyncSymbol].infix))
}

/** Preconfigured factory that creates  {@link AsyncAction}s for a specific opereation and lifecycle event. */
export interface AsyncActionCreator<Payload extends any[]> {
  /** The call signature. Returns an  {@link AsyncAction} with this action creator's {@link AsyncSessionMeta}. */
  (...payload: Payload): AsyncAction<Payload>
  /** Full type constant for actions created by this function, e.g. `stately-asnc/myFunction/call`. */
  readonly type: string
  /** Metadata for the owning {@link AsyncLifecycle}. */
  readonly meta: AsyncActionMeta
  /**
   * Function that returns true iff the given action matches all properties of this action creator's {@link AsyncSessionMeta}.
   * In practice, this can be used to detect actions dispatched for this specific operation and lifecycle event.
   */
  readonly match: (action: Action) => action is AsyncAction<Payload>
}

const getInfix = <Data, Params extends any[]>(
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
      'The action type will be derived using the lifecycle\'s uuid, which is ugly and non-descriptive.\n',
      'This also means it will be impossible to use asyncActionMatchers() to create matchers for the given AsyncOperation.',
      'It is recommended that only non-anonymous AsyncOperations are used.',
    )
    return id
  }
}

/**
 * Internal factory function that creates a redux-like `ActionCreator` with the given lifecycle metadata and {@link AsyncSessionActionType}.
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
  lifecycleEvent: AsyncLifecycleEvent,
): AsyncActionCreator<Payload> => {
  const infix = getInfix(operation, id)
  const type = `${ACTION_PREFIX}/${infix}/${lifecycleEvent}`
  const meta = { id, infix, lifecycleEvent }
  const actionCreator = (...payload: Payload) => ({
    type,
    payload,
    [StatelyAsyncSymbol]: meta,
  })
  const guard = asyncActionMatcher(lifecycleEvent, operation)
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
