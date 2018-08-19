import { Observable, ObservableInput, from as $from } from 'rxjs'

export type ObservableFn<Data, Params extends any[]> = (params: Params) => Observable<Data>

export type ObservableInputEffect<Data, Params extends any[]> = (
  ...params: Params
) => ObservableInput<Data>
export type AsyncGeneratorEffect<Data, Params extends any[]> = (
  ...params: Params
) => AsyncIterable<Data>

export type Effect<Data, Params extends any[]> =
  | ObservableInputEffect<Data, Params>
  | AsyncGeneratorEffect<Data, Params>

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

export const $fromEffect = <Data, Params extends any[]>(
  effect: Effect<Data, Params>,
): ObservableFn<Data, Params> => (params: Params) => {
  const fxAbstraction = effect(...params)
  return isAsyncIterable(fxAbstraction) ? $fromAsyncIterable(fxAbstraction) : $from(fxAbstraction)
}
