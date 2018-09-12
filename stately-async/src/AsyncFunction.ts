/** Defines {@link AsyncFunction}, which represents any function that performs an asynchronous operation. */

/** @ignore */
import { Observable, ObservableInput, from as $from } from 'rxjs'

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
 * A type describing any function that returns a value that can be represented with an Observable.
 * This type is used as the constraint for the sole parameter of {@link createAsyncSession}.
 */
export type AsyncFunction<Data, Params extends any[]> =
  | ObservableInputFunction<Data, Params>
  | AsyncGenerator<Data, Params>

const isAsyncIterable = <Data>(obj: AsyncIterable<Data> | any): obj is AsyncIterable<Data> =>
  Symbol.asyncIterator in obj && typeof obj[Symbol.asyncIterator] === 'function'

const $fromAsyncIterable = <Data>(asyncIterable: AsyncIterable<Data>): Observable<Data> =>
  new Observable(
    subscriber =>
      void (async () => {
        try {
          for await (const data of asyncIterable) {
            if (subscriber.closed) {
              return
            }
            subscriber.next(data)
          }
          subscriber.complete()
        } catch (e) {
          subscriber.error(e)
        }
      })(),
  )

export const $fromAsyncFunction = <Data, Params extends any[]>(
  asyncFunction: AsyncFunction<Data, Params>,
): ObservableFunction<Data, Params> => (params: Params) => {
  const future = asyncFunction(...params)
  return isAsyncIterable(future) ? $fromAsyncIterable(future) : $from(future)
}
