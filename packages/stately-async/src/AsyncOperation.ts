/** @module stately-async */
import { Observable, ObservableInput } from 'rxjs'

/** A function that returns an Observable. */
export type ObservableFunction<Data, Params extends any[]> = (params: Params) => Observable<Data>

/** A function that returns anything that can be converted to an Observable. */
export type ObservableInputFunction<Data, Params extends any[]> = (
  ...params: Params
) => ObservableInput<Data>
/** A function that returns an AsyncIterable. Generally, these are defined using `async function*`. */
export type AsyncGenerator<Data, Params extends any[]> = (
  ...params: Params
) => AsyncIterable<Data>

/**
 * A type describing any function that returns a value that can be represented with an `Observable` (which is virtually anything).
 * This type is used as the constraint for the sole parameter of {@link asyncLifecycle}.
 */
export type AsyncOperation<Data, Params extends any[]> =
  | ObservableInputFunction<Data, Params>
  | AsyncGenerator<Data, Params>
