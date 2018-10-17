/** @module stately-async */
import { Observable, Subject, ObservableInput, from as $rxFrom, BehaviorSubject } from 'rxjs'
import { filter as $filter } from 'rxjs/operators'
import { Action, Middleware, Store, AnyAction } from 'redux'

const isAsyncIterable = <Data>(obj: AsyncIterable<Data> | any): obj is AsyncIterable<Data> =>
Symbol.asyncIterator in obj && typeof obj[Symbol.asyncIterator] === 'function'

/** Internal. Converts an `AsyncIterable` to an `Observable` by piping its yield into the subscriber until the `AsyncIterable` is exhausted. */
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

/** Signature of an event-like API for subscribing to Redux `Action`s. Used internally as a testing utility. */
export type RegisterListener<E> = (
  match: (action: E) => boolean,
  handler: (action: E) => void,
  onError?: (err?: any) => void,
) => Unsubscribe

/**
 * API exposing {@link RegisterListener} methods that will listen for all matching `Action`s, or only the next matching `Action`.
 * Created by {@link $toEvents}.
 */
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

/**
 * Object type containing the crucial methods to behave like an RxJS `Subject`.
 * Unlike traditional `Subject`s, this interface allows for a different type to be passed to `next()` than the type that is given by `subscribe()`.
 * This is so that a Redux `Store` can masquerade as something resembling a `Subject`, to simplify modules wishing to support both.
 */
export interface SubjectLike<S, A = S> {
  subscribe: Subject<S>['subscribe']
  next: Subject<A>['next']
}

/** Object type containing the crucial methods to behave like a Redux `Store`. */
export interface StoreLike<S, A extends Action = AnyAction> {
  subscribe: Store<S, A>['subscribe']
  getState: Store<S, A>['getState']
  dispatch: Store<S, A>['dispatch']
}

/** Type guard that indicates whether an object has the crucial methods to behave like a Redux Store. */
export const isStoreLike = (maybeStoreLike: StoreLike<any, any> | any): maybeStoreLike is StoreLike<any, any> =>
  'subscribe' in maybeStoreLike && typeof maybeStoreLike.subscribe === 'function' &&
  'getState' in maybeStoreLike && typeof maybeStoreLike.getState === 'function' &&
  'dispatch' in maybeStoreLike && typeof maybeStoreLike.dispatch === 'function'

/** Function that converts `Store<S, A>` -> `SubjectLike<S, A>`. */
export const $fromStore = <S, A extends Action>(store: StoreLike<S, A>): SubjectLike<S, A> => {
  const state$ = new BehaviorSubject<S>(store.getState())
  store.subscribe(() => {
    state$.next(store.getState())
  })
  return {
    subscribe: state$.subscribe.bind(state$),
    next: (action: A) => { store.dispatch(action) }
  }
}
