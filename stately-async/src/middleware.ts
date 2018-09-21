/** Defines {@link statelyAsyncMiddleware} and {@link statelyAsyncEpic}. */

/** @ignore */
import { Observable, empty as $empty, Subject } from 'rxjs'
import { filter as $filter, mergeMap as $mergeMap, first as $first } from 'rxjs/operators'
import { Action, Middleware } from 'redux'

import { asyncActionMatcher } from './actions'
import { get } from './cache'
import { StatelyAsyncSymbol } from './AsyncState'
import { $from, $toMiddleware } from './observables';

/**
 * Accepts an `Observable<Action>` and subscribes to it.
 * When an {@link AsyncAction} of type `call` is received, the epic triggers the corresponding {@link AsyncOperation}.
 * 
 * When the `AsyncOperation` emits data, encounters an error, or is completed, the `'data'`, `'error'`, and `'complete'` actions are dispatched, respectively.
 * 
 * The function signature matches the `Epic` type from `redux-observable`, and is meant to be used with `combineEpics` if you are using `redux-observable` in your project.
 * If you are not using `redux-observable`, use {@link statelyAsyncMiddleware} instead.
 */
export const statelyAsyncEpic = (action$: Observable<Action>): Observable<Action> =>
  action$.pipe(
    $filter(asyncActionMatcher('call')),
    $mergeMap(action => {
      const uuidEntry = get(action[StatelyAsyncSymbol].id)
      if (uuidEntry) {
        const {
          actions: {
            call: { match: matchCall },
            data,
            error,
            complete,
            destroy: { match: matchDestroy },
          },
          operation,
        } = uuidEntry
        return new Observable(subscriber => {
          try {
            const subscription = $from(operation(...action.payload)).subscribe(
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
 * Calls the `statelyAsyncEpic` with the `action$` returned by {@link action$Middleware}.
 * Lightweight integration middleware, intended for projects that are not using `redux-observable`.
 */
export const statelyAsyncMiddleware: Middleware = store => {
  const action$: Subject<Action> = new Subject()
  const middleware = $toMiddleware(action$)
  statelyAsyncEpic(action$).subscribe(store.dispatch)
  return middleware(store)
}

