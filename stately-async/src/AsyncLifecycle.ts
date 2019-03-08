/** @module stately-async */
import { v4 as uuid } from 'uuid'

import { AsyncOperation } from './AsyncOperation'
import { AsyncSlice, AsyncState, initialAsyncState, StatelyAsyncSymbol } from './AsyncState'
import { AsyncActionCreator, asyncActionCreatorFactory } from './actions'
import { set } from './cache'

/**
 * An object that provides a consistent, automated means to track loading, error, success, and data states for any {@link AsyncOperation}.
 * This allows consumers - typically view components - to avoid duplicating ugly, error-prone side-effect branching logic and focus on rendering their declarative views.
 *
 * This is the primary export of `stately-async`.
 *
 * Each `AsyncLifecycle` is related to a unique {@link AsyncState}, where the current execution state of the `AsyncOperation` is maintained.
 * Dispatching the {@link AsyncLifecycle#call} action on a properly configured Store invokes the given `AsyncOperation` and begins a lifecycle.
 * Any component subscribing to state changes can use the {@link AsyncLifecycle#selector} to access the `AsyncState`.
 *
 * Actions dispatched from this object only affect the state of the owned `AsyncState`.
 * The `selector` on this instance retrieves the managed `AsyncState` from the given root state.
 *
 * Most consumers only need to use `selector`, `call`, and `destroy`.
 * Advanced use cases may leverage the additional action creators.
 * **Do not forget to dispatch {@link AsyncLifecycle#destroy}** when the lifecycle is no longer needed.
 * Failure to do so cause a memory leak.
 */
export interface AsyncLifecycle<Data, Params extends any[]> {
  /** The uuid of the `AsyncState` owned by this manager. */
  readonly id: string
  /** The `AsyncOperation` given to {@link asyncSession}. */
  readonly operation: AsyncOperation<Data, Params>
  /** Returns the `AsyncState` instance owned by this manager. */
  readonly selector: (
    /** A state tree containing an {@link AsyncSessionSlice}. */
    state: AsyncSlice,
  ) => AsyncState<Data, Params>
  /** Action creator that triggers the associated `AsyncOperation` when dispatched, passing any parameters directly through. */
  readonly call: AsyncActionCreator<Params>
  /**
   * Removes the `AsyncState` instance owned by this `AsyncLifecycle` from the state tree.
   * Failure to dispatch `destroy` results in a memory leak, as `AsyncState` objects remain in the state tree until they are destroyed, even if they are no longer being used.
   * For React components, a good practice is to dispatch the `destroy` action in the component's `componentWillUnmount` hook.
   */
  readonly destroy: AsyncActionCreator<[]>
  /** Action dispatched internally when the associated `AsyncOperation` emits data. */
  readonly data: AsyncActionCreator<[Data]>
  /** Action dispatched internally when the associated `AsyncOperation` emits an error (rejects) or throws an exception. */
  readonly error: AsyncActionCreator<[any]>
  /** Action dispatched internally when the associated `AsyncOperation` completes (resolves, or emits all data in the case of an `Observable` or `AsyncIterable`). */
  readonly complete: AsyncActionCreator<[]>
  /** Action dispatched internally when the associated `AsyncOperation` is reset to it's initialState */
  readonly reset: AsyncActionCreator<[]>
}

/** A factory function that creates an {@link AsyncLifecycle} for a given {@link AsyncOperation}. */
export const asyncLifecycle = <Data, Params extends any[]>(
  operation: AsyncOperation<Data, Params>,
): AsyncLifecycle<Data, Params> => {
  const id = uuid()
  const factory = asyncActionCreatorFactory(operation, id)
  const actions: AsyncLifecycle<Data, Params> = Object.freeze({
    id,
    operation,
    selector: (state: AsyncSlice) => state[StatelyAsyncSymbol][id] || initialAsyncState,
    call: factory<Params>('call'),
    destroy: factory<[]>('destroy'),
    data: factory<[Data]>('data'),
    error: factory<any>('error'),
    complete: factory<[]>('complete'),
    reset: factory<[]>('reset'),
  })
  set(id, actions)
  return actions
}

/** `Class` implementation of {@link AsyncLifecycle}. Basically just allows `new AsyncLifecycle(operation)`, if you like that sort of thing. */
export class AsyncLifecycle<Data, Params extends any[]> implements AsyncLifecycle<Data, Params> {
  constructor(operation: AsyncOperation<Data, Params>) {
    return asyncLifecycle(operation)
  }
}
