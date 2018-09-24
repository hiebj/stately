/**
 * Defines utilities for creating and transforming `Observable`.
 * Includes:
 * - {@link $fromStore}: `Store<S> -> Observable<S>`
 * - {@link $toMiddleware}: `Store<S, A> -> Observable<A>`
 * - {@link $toEvents}, `Observable<T> -> EventAPI<T>`
 */

/** @ignore */
import { Observable, Subject, ObservableInput, from as $rxFrom } from 'rxjs'
import { filter as $filter } from 'rxjs/operators'
import { Action, Middleware } from 'redux'

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

export interface StoreLike<S> {
  subscribe: (onStateChange: () => void) => void
  getState: () => S
  dispatch: (action: Action) => void
}

/** Type guard that indicates whether an object has the crucial methods to behave like a Redux Store. */
export const isStoreLike = (maybeStoreLike: StoreLike<any> | {}): maybeStoreLike is StoreLike<any> =>
  'subscribe' in maybeStoreLike && typeof maybeStoreLike.subscribe === 'function' &&
  'getState' in maybeStoreLike && typeof maybeStoreLike.getState === 'function' &&
  'dispatch' in maybeStoreLike && typeof maybeStoreLike.dispatch === 'function'

/** Function that converts `Store<S>` -> `Observable<S>`. */
export const $fromStore = <S>(store: StoreLike<S>): Observable<S> =>
  new Observable((subscriber) => {
    store.subscribe(() => {
      subscriber.next(store.getState())
    })
  })

/**
 * Function extending `Observable.from()` defined by RxJS.
 * Adds support for conversion from `Store<S>` and `AsyncIterable<S>` (the type returned by TC39 "Async Generators").
 * See {@link https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html#async-iteration}
 */
export const $from = <Item>(observableInput: AsyncIterable<Item> | ObservableInput<Item>) => {
  return isStoreLike(observableInput) ? $fromStore(observableInput) :
    isAsyncIterable(observableInput) ? $fromAsyncIterable(observableInput) :
    $rxFrom(observableInput)
}

/**
 * Returns a Redux `Middleware` that pipes all dispatched actions through the given `Subject`.
 * Essentially, provides an indirect means to create an `Observable<Action>` from a Redux store.
 * Subscribers to the Subject are notified after the reducers are called, so can perform side-effects without delaying state updates.
 * This middleware can be used as a lightweight alternative to `redux-observable`.
 */
export const $toMiddleware = (action$: Subject<Action>): Middleware =>
  () =>
    next => action => {
      const result = next(action)
      action$.next(action)
      return result
    }

export type Unsubscribe = () => void

export type RegisterListener<E> = (
  match: (action: E) => boolean,
  handler: (action: E) => void,
  onError?: (err?: any) => void,
) => Unsubscribe

export interface EventAPI<E> {
  on: RegisterListener<E>
  one: RegisterListener<E>
}

/**
 * Given an `Observable<Action>`, returns a simple event-like API that can be used to register simple "handlers" for Redux actions.
 * Once registered, a handler will be called with the dispatched action(s) matching the given filter.
 * The optional `onError` parameter is called if an exception is thrown at any time, creating an error boundary to prevent cryptic failures.
 * Intended only as a utility for testing middleware. Do not use this in production.
 * 
 * Tip: Passing a `Mocha.Done` callback as the `onError` parameter will cause an exception thrown in the handler to fail the current test.
 * This way, this function can be used to make assertions about store state or component output based on an expected action.
 * 
 * See `observables.spec.ts` for an example.
 */
export const $toEvents = (action$: Observable<Action>): EventAPI<Action> => {
  const registerFactory = (once?: boolean): RegisterListener<Action> =>
    (match, handler, onError?) => {
      const subscription = action$
        .pipe($filter(match))
        .subscribe(action => {
          try {
            handler(action)
          } catch (e) {
            if (onError) {
              onError(e)
            } else {
              throw e
            }
          }
          if (once) {
            subscription.unsubscribe()
          }
        })
        return () => subscription.unsubscribe()
      }
  return {
    on: registerFactory(),
    one: registerFactory(true)
  }
}
