/** Defines the {@link AsyncLifecycle} type and the {@link asyncLifecycle} factory. */

/** @ignore */
import { v4 as uuid } from 'uuid'

import { AsyncOperation } from "./AsyncOperation";
import { AsyncSlice, AsyncState, initialAsyncState, StatelyAsyncSymbol } from "./AsyncState";
import { AsyncActionCreator, asyncActionCreatorFactory } from "./actions";
import { set } from "./cache";


/**
 * An object containing action creators allowing the management of {@link AsyncState} for an {@link AsyncOperation}.
 * 
 * Actions dispatched from this object will only affect the state of the owned `AsyncState`.
 * The `selector` on this instance will retrieve the managed `AsyncState` from the given root state.
 * 
 * Most consumers will only need to use `selector`, `call`, and `destroy`.
 * Advanced use cases may leverage the additional action creators.
 * **Do not forget to dispatch {@link AsyncLifecycle#destroy}** when the lifecycle is no longer needed.
 * Failure to do so will cause a memory leak.
 */
export interface AsyncLifecycle<Data, Params extends any[]> {
  /** The uuid of the `AsyncState` owned by this manager. */
  readonly id: string
  /** The `AsyncOperation` given to {@link asyncSession}. */
  readonly operation: AsyncOperation<Data, Params>
  /** Returns the `AsyncState` instance owned by this manager. */
  readonly selector: (
    /** A state tree containing an {@link AsyncSessionSlice}. */
    state: AsyncSlice
  ) => AsyncState<Data, Params>
  /** Action creator that will trigger the associated `AsyncOperation` when dispatched, passing any parameters directly through. */
  readonly call: AsyncActionCreator<Params>
  /**
   * Removes the `AsyncState` instance owned by this `AsyncLifecycle` from the state tree.
   * Failure to dispatch `destroy` will result in a memory leak, as `AsyncState` objects will remain in the state tree until they are destroyed, even if they are no longer being used.
   * For React components that own an `AsyncLifecycle`, a good practice is to dispatch the `destroy` action in the component's `componentWillUnmount` hook.
   */
  readonly destroy: AsyncActionCreator<[]>
  /** Action dispatched internally when the associated `AsyncOperation` emits data. */
  readonly data: AsyncActionCreator<[Data]>
  /** Action dispatched internally when the associated `AsyncOperation` emits an error (rejects) or throws an exception. */
  readonly error: AsyncActionCreator<[any]>
  /** Action dispatched internally when the associated `AsyncOperation` completes (resolves, or emits all data in the case of an Observable or AsyncIterable). */
  readonly complete: AsyncActionCreator<[]>
}

/**
 * A factory function that creates a new, unique {@link AsyncLifecycle} for a given {@link AsyncOperation}.
 * `AsyncLifecycle` provides a consistent, automated means to track loading, error, success, and data states for asynchronous operations.
 * This allows consumers to avoid duplicating ugly, error-prone side-effect branching logic and focus on rendering their declarative views.
 * This is the primary function of this module.
 * 
 * Dispatching the {@link AsyncLifecycle#call} action on a properly configured Store will invoke the given `AsyncOperation` and begin tracking its output in an {@link AsyncState}.
 * Any component subscribing to state changes can use the {@link AsyncLifecycle#selector} to access the `AsyncState` and render its view appropriately.
 */
export const asyncLifecycle = <Data, Params extends any[]>(
  operation: AsyncOperation<Data, Params>
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
  })
  set(id, actions)
  return actions
}
