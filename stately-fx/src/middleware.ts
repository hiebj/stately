import { Observable, empty as $empty, Subject } from 'rxjs'
import { filter as $filter, mergeMap as $mergeMap, first as $first } from 'rxjs/operators'
import { AnyAction, Middleware } from 'redux'

import { isCallFxAction } from './actions'
import { get } from './cache'

export const fxEpic = (action$: Observable<AnyAction>): Observable<AnyAction> =>
  action$.pipe(
    $filter(isCallFxAction),
    $mergeMap(action => {
      const uuidEntry = get(action.fx.id)
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
                $filter((action: AnyAction) => matchCall(action) || matchDestroy(action)),
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

export const fxMiddleware: Middleware = store => {
  const action$: Subject<AnyAction> = new Subject()
  fxEpic(action$).subscribe(store.dispatch)
  return next => action => {
    const result = next(action)
    action$.next(action)
    return result
  }
}
