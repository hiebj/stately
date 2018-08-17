import { Observable, ObservableInput, from as $from } from 'rxjs'

export type ObservableFn<Item, Params extends any[]> = (params: Params) => Observable<Item>

type ObservableInputEffect<Item, Params extends any[]> = (
  ...params: Params
) => ObservableInput<Item>
type AsyncGeneratorEffect<Item, Params extends any[]> = (...params: Params) => AsyncIterable<Item>

export type Effect<Item, Params extends any[]> =
  | ObservableInputEffect<Item, Params>
  | AsyncGeneratorEffect<Item, Params>

const isAsyncIterable = <Item>(obj: AsyncIterable<Item> | any): obj is AsyncIterable<Item> =>
  Symbol.asyncIterator in obj && typeof obj[Symbol.asyncIterator] === 'function'

const $fromAsyncIterable = <Item>(asyncIterable: AsyncIterable<Item>): Observable<Item> =>
  new Observable(
    subscriber =>
      void (async () => {
        try {
          for await (const item of asyncIterable) {
            if (subscriber.closed) {
              return
            }
            subscriber.next(item)
          }
          subscriber.complete()
        } catch (e) {
          subscriber.error(e)
        }
      })(),
  )

export const $fromEffect = <Item, Params extends any[]>(
  effect: Effect<Item, Params>,
): ObservableFn<Item, Params> => (params: Params) => {
  const fxAbstraction = effect(...params)
  return isAsyncIterable(fxAbstraction) ? $fromAsyncIterable(fxAbstraction) : $from(fxAbstraction)
}
