import { Observable, Subscriber, empty as $empty } from 'rxjs'
import { filter as $filter, mergeMap as $mergeMap } from 'rxjs/operators'
import { AnyAction, Middleware } from 'redux'

import { isSubscribeFxAction } from './actions'
import { get } from './cache'

export const fxEpic = (action$: Observable<AnyAction>): Observable<AnyAction> =>
  action$.pipe(
    $filter(isSubscribeFxAction),
    $mergeMap(action => {
      const uuidEntry = get(action.fx.id)
      if (uuidEntry) {
        const {
          actions: {
            next,
            error,
            complete,
            unsubscribe: { match: matchUnsubscribe },
            destroy: { match: matchDestroy },
          },
          effect,
        } = uuidEntry
        return new Observable(subscriber => {
          try {
            const subscription = effect(action.payload).subscribe(
              data => subscriber.next(next(data)),
              err => subscriber.next(error(err)),
              () => subscriber.next(complete()),
            )
            action$
              .pipe(
                $filter((action: AnyAction) => matchUnsubscribe(action) || matchDestroy(action)),
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
  let action$subscriber: Subscriber<AnyAction>
  const action$: Observable<AnyAction> = new Observable(subscriber => {
    action$subscriber = subscriber
  })
  fxEpic(action$).subscribe(store.dispatch)
  return next => action => {
    const result = next(action)
    action$subscriber.next(action)
    return result
  }
}
