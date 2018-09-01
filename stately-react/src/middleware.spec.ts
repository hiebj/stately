import { Middleware, AnyAction } from 'redux'
import { Subject } from 'rxjs'
import { filter as $filter, first as $first } from 'rxjs/operators'

export type AddTestActionListener = (
  matchAction: (action: AnyAction) => boolean,
  handler: () => void,
  done?: Mocha.Done,
) => void

export const testMiddleware = () => {
  const action$: Subject<AnyAction> = new Subject()
  const middleware: Middleware = () => {
    return next => action => {
      const result = next(action)
      action$.next(action)
      return result
    }
  }
  const onNext: AddTestActionListener = (matchAction, handler, done?) => {
    action$
      .pipe(
        $filter(matchAction),
        $first(),
      )
      .subscribe(() => {
        try {
          handler()
        } catch (e) {
          if (done) {
            done(e)
          } else {
            throw e
          }
        }
      })
  }
  return {
    action$,
    middleware,
    onNext,
  }
}
