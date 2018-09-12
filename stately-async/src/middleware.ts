/** Defines {@link statelyAsyncMiddleware} and {@link statelyAsyncEpic}. */

/** @ignore */
import { Observable, empty as $empty, Subject } from 'rxjs'
import { filter as $filter, mergeMap as $mergeMap, first as $first } from 'rxjs/operators'
import { Action, Middleware } from 'redux'

import { asyncActionMatcher } from './actions'
import { get } from './cache'
import { StatelyAsyncSymbol } from './AsyncSession'

/**
 * Accepts an `Observable<Action>` and subscribes to it.
 * When an {@link AsyncSessionAction} of type `call` is received, the epic triggers the corresponding {@link AsyncFunction}.
 * 
 * When the `AsyncFunction` emits data, encounters an error, or is completed, the `'data'`, `'error'`, and `'complete'` actions are dispatched, respectively.
 * 
 * The function signature matches the `Epic` type from `redux-observable`, and is meant to be used with `combineEpics` if you are using `redux-observable` in your project.
 * If you are not using `redux-observable`, use {@link statelyAsyncMiddleware} instead.
 */
export const statelyAsyncEpic = (action$: Observable<Action>): Observable<Action> =>
  action$.pipe(
    $filter(asyncActionMatcher('call')),
    $mergeMap(action => {
      const uuidEntry = get(action[StatelyAsyncSymbol].sid)
      if (uuidEntry) {
        const {
          actions: {
            call: { match: matchCall },
            data,
            error,
            complete,
            destroy: { match: matchDestroy },
          },
          effect,
        } = uuidEntry
        return new Observable(subscriber => {
          try {
            const subscription = effect(action.payload).subscribe(
              nextData => subscriber.next(data(nextData)),
              err => subscriber.next(error(err)),
              () => subscriber.next(complete()),
            )
            action$
              .pipe(
                $filter((action: Action) => matchCall(action) || matchDestroy(action)),
                $first(),
              )
              .subscribe(() => subscription.unsubscribe())
          } catch (err) {
            subscriber.next(error(err))
          }
        })
      } else {
        return $empty()
      }
    }),
  )

/**
 * Pipes all dispatched actions into an `Observable<Action>`, returned as `action$`.
 * A valid Redux `Middleware` shape is returned as `middleware`.
 * Very similar to `redux-observable`, but simpler.
 */
export const action$Middleware = () => {
  const action$: Subject<Action> = new Subject()
  const middleware: Middleware = () =>
    next => action => {
      const result = next(action)
      action$.next(action)
      return result
    }
  return {
    action$,
    middleware
  }
}

/**
 * Calls the `statelyAsyncEpic` with the `action$` returned by {@link action$Middleware}.
 * Lightweight integration middleware, intended for projects that are not using `redux-observable`.
 */
export const statelyAsyncMiddleware: Middleware = store => {
  const { action$, middleware } = action$Middleware()
  statelyAsyncEpic(action$).subscribe(store.dispatch)
  return middleware(store)
}

export type AddTestActionListener = (
  match: (action: Action) => boolean,
  handler: (action: Action) => void,
  onError?: (err?: any) => void,
) => void

/**
 * Intended only as a utility for testing middleware. Do not use this in production.
 * Given an `Observable<Action>`, returns a simple event-like API that will watch for the next action matching a given filter.
 * The optional `onError` parameter is called if an exception is thrown in your handler.
 * Passing the a `Mocha.Done` as the `onError` parameter will cause an exception thrown in your handler to fail your test (which is ideal).
 */
export const onNext = (action$: Observable<Action>): AddTestActionListener =>
  (match, handler, onError?) => {
    action$
      .pipe(
        $filter(match),
        $first(),
      )
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
      })
    }

