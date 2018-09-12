/** Defines the {@link createAsyncSession} and {@link asyncActionMatcher} functions, as well as the {@link AsyncSessionManager} type. */

/** @ignore */
import { Action } from 'redux'
import { v4 as uuid } from 'uuid'

import { StatelyAsyncSymbol, AsyncSessionSlice, AsyncSession, initialAsyncSession } from './AsyncSession'
import { AsyncFunction, $fromAsyncFunction } from './AsyncFunction'
import { set } from './cache'

/** The prefix applied to all actions created by this library. */
const ACTION_PREFIX = 'stately-async'

/** A union type representing all of the possible `type` values for {@link AsyncSessionAction}s. */
export type AsyncSessionActionType = 'call' | 'data' | 'error' | 'complete' | 'destroy'

/** Metadata appended to an  {@link AsyncSessionAction}, describing the relevant {@link AsyncSession}. */
export interface AsyncSessionMeta {
  /** uuid for the owning {@link AsyncSession} */
  readonly sid: string
  /** Session action subtype, e.g. `call` */
  readonly saction: AsyncSessionActionType
  /** Session action infix, e.g. `myFunction` */
  readonly infix: string
}

/** A special type of action dispatched by this library, describing a state change in an {@link AsyncSession}. */
export interface AsyncSessionAction<Payload extends any[]> extends Action {
  readonly type: string
  readonly payload: Payload
  readonly [StatelyAsyncSymbol]: AsyncSessionMeta
}

/** Type guard to indicate whether a given action is an  {@link AsyncSessionAction}. */
export const isAsyncSessionAction = (action: Action): action is AsyncSessionAction<any[]> =>
  StatelyAsyncSymbol in action

/**
 * Factory that will create a configurable type guard.
 * The returned guard will test a given action, returning true iff:
 * - the action is an {@link AsyncSessionAction}
 * - no `type` is given, or the action's `saction` matches the given `type`
 * - no `asyncFunction` is given, or the action's `infix` matches the `name` of the given `asyncFunction`
 */
export function asyncActionMatcher<Data, Params extends any[]>(type?: 'call', asyncFunction?: AsyncFunction<Data, Params>): (action: Action) => action is AsyncSessionAction<Params>
export function asyncActionMatcher<Data, Params extends any[]>(type?: 'data', asyncFunction?: AsyncFunction<Data, Params>): (action: Action) => action is AsyncSessionAction<[Data]>
export function asyncActionMatcher<Data, Params extends any[]>(type?: 'error', asyncFunction?: AsyncFunction<Data, Params>): (action: Action) => action is AsyncSessionAction<[any]>
export function asyncActionMatcher<Data, Params extends any[]>(type?: AsyncSessionActionType, asyncFunction?: AsyncFunction<Data, Params>): (action: Action) => action is AsyncSessionAction<[]>
export function asyncActionMatcher<Data, Params extends any[]>(type?: AsyncSessionActionType, asyncFunction?: AsyncFunction<Data, Params>) {
  return (action: Action) => 
    isAsyncSessionAction(action) &&
    !!(!type || action[StatelyAsyncSymbol].saction === type) &&
    !!(!asyncFunction || (asyncFunction.name && asyncFunction.name === action[StatelyAsyncSymbol].infix))
}

/** Function that creates  {@link AsyncSessionAction}s of a given type for a specific session. */
export interface AsyncSessionActionCreator<Payload extends any[]> {
  /** The call signature. Returns an  {@link AsyncSessionAction} with this action creator's {@link AsyncSessionMeta}. */
  (...payload: Payload): AsyncSessionAction<Payload>
  /** Full type constant for actions created by this function, e.g. `stately-asnc/myFunction/call`. */
  readonly type: string
  /** Metadata for the owning {@link AsyncSession}. */
  readonly meta: AsyncSessionMeta
  /**
   * Function that returns true iff the given action matches all properties of this action creator's {@link AsyncSessionMeta}.
   * In practice, this can be used to detect actions dispatched for this specific session, of this specific type.
   */
  readonly match: (action: Action) => action is AsyncSessionAction<Payload>
}

/**
 * An object containing action creators and metadata for a single {@link AsyncSession} of an {@link AsyncFunction}.
 * 
 * Actions dispatched from this manager will only affect the state of the owned `AsyncSession`.
 * The `selector` on this instance will retrieve the managed `AsyncSession` from the given Store.
 * 
 * Most consumers will only need to use `selector`, `call`, and `destroy`.
 * Advanced use cases may leverage the additional action creators.
 */
export interface AsyncSessionManager<Data, Params extends any[]> {
  /** The uuid of the `AsyncSession` owned by this manager. */
  readonly sid: string
  /** The `AsyncFunction` given to {@link asyncSession}. */
  readonly asyncFunction: AsyncFunction<Data, Params>
  /** Returns the `AsyncSession` instance owned by this manager. */
  readonly selector: (
    /** A state tree containing an {@link AsyncSessionSlice}. */
    state: AsyncSessionSlice
  ) => AsyncSession<Data, Params>
  /** Action creator that will trigger the associated `AsyncFunction` when dispatched, passing any parameters directly through. */
  readonly call: AsyncSessionActionCreator<Params>
  /**
   * Destroys the session, removing the `AsyncSession` instance owned by this manager from the state tree.
   * Failure to dispatch `destroy` will result in a memory leak, as `AsyncSession` objects will remain in the state tree until they are destroyed, even if they are no longer being used.
   * For React components that own an `AsyncSession`, a good practice is to dispatch the `destroy` action in the component's `componentWillUnmount` hook.
   */
  readonly destroy: AsyncSessionActionCreator<[]>
  /** Action dispatched internally when the associated `AsyncFunction` emits data. */
  readonly data: AsyncSessionActionCreator<[Data]>
  /** Action dispatched internally when the associated `AsyncFunction` emits an error (rejects) or throws an exception. */
  readonly error: AsyncSessionActionCreator<[any]>
  /** Action dispatched internally when the associated `AsyncFunction` completes (resolves, or emits all data in the case of an Observable or AsyncIterable). */
  readonly complete: AsyncSessionActionCreator<[]>
}

const getInfix = <Data, Params extends any[]>(
  asyncFunction: AsyncFunction<Data, Params>,
  sid: string,
) => {
  if (asyncFunction.name) {
    return asyncFunction.name
  } else {
    // tslint:disable-next-line:no-console
    console.warn(
      'stately-async:\n',
      '#createAsyncSession was called with an anonymous AsyncFunction.\n',
      'The action type will be derived using the session\'s uuid, which is ugly and non-descriptive.\n',
      'This also means it will be impossible to use `asyncActionMatchers` to create matchers for the given AsyncFunction.',
      'It is recommended that only non-anonymous AsyncFunctions are used.',
    )
    return sid
  }
}

const sessionActionCreator = <Params extends any[]>(
  sid: string,
  infix: string,
  saction: AsyncSessionActionType,
): AsyncSessionActionCreator<Params> => {
  const type = `${ACTION_PREFIX}/${infix}/${saction}`
  const meta = { sid, saction, infix }
  const actionCreator = (...payload: Params) => ({
    type,
    payload,
    [StatelyAsyncSymbol]: meta,
  })
  const match = (action: Action): action is AsyncSessionAction<Params> =>
    isAsyncSessionAction(action) &&
    action[StatelyAsyncSymbol].infix === infix &&
    action[StatelyAsyncSymbol].saction === saction &&
    // really, we could get away with only checking the uuid...
    action[StatelyAsyncSymbol].sid === sid
  return Object.freeze(
    Object.assign(actionCreator, {
      type,
      meta,
      match
    }),
  )
}

/**
 * A factory function that will return a unique {@link AsyncSessionManager} for a given {@link AsyncFunction}.
 * 
 * This is the primary method of this library. It is intended to be used by any component or service that needs to maintain or represent the current state or result of an asynchronous task.
 */
export const createAsyncSession = <Data, Params extends any[]>(
  asyncFunction: AsyncFunction<Data, Params>
): AsyncSessionManager<Data, Params> => {
  const sid = uuid()
  const infix = getInfix(asyncFunction, sid)
  const actions = Object.freeze({
    sid,
    asyncFunction,
    selector: (state: AsyncSessionSlice) => state[StatelyAsyncSymbol][sid] || initialAsyncSession,
    call: sessionActionCreator<Params>(sid, infix, 'call'),
    destroy: sessionActionCreator<[]>(sid, infix, 'destroy'),
    data: sessionActionCreator<[Data]>(sid, infix, 'data'),
    error: sessionActionCreator<any>(sid, infix, 'error'),
    complete: sessionActionCreator<[]>(sid, infix, 'complete'),
  }) as AsyncSessionManager<Data, Params>
  set(sid, actions, $fromAsyncFunction(asyncFunction))
  return actions
}
