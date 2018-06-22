// TODO use native Observable?
import {
  Observable,
  ObservableInput,
  Subscriber,
  from as $from,
  empty as $empty,
  of as $of,
} from 'rxjs'
import { filter as $filter, mergeMap as $mergeMap } from 'rxjs/operators'
import { AnyAction, Reducer, Middleware } from 'redux'
// TODO remove (or minimize) `lodash` dependency
import { memoize, MemoizedFunction } from 'lodash'
import { v4 as uuid } from 'uuid'

import reduceReducers from './reduceReducers'

export interface InitialFxState {
  status: null
  params: null
  data: null
  error: null
}

export interface SubscribingFxState<Params> {
  // TODO better names for states?
  status: 'subscribing'
  params: Params | null
  data: null
  error: null
}

export interface SubscribedFxState<Item, Params> {
  status: 'subscribed'
  params: Params | null
  data: Item
  error: null
}

export interface ErrorFxState<Item, Params> {
  status: 'error'
  params: Params | null
  data: Item | null
  error: any
}

export interface CompletedFxState<Item, Params> {
  status: 'completed'
  params: Params | null
  data: Item
  error: null
}

export type FxState<Item, Params = undefined> =
  | InitialFxState
  | SubscribingFxState<Params>
  | SubscribedFxState<Item, Params>
  | ErrorFxState<Item, Params>
  | CompletedFxState<Item, Params>

export const initialFxState: InitialFxState = {
  status: null,
  params: null,
  data: null,
  error: null,
}

export interface FxSlice {
  fx: { [key: string]: FxState<any, any> }
}

type ObservableFn<Item, Params> = (params: Params) => Observable<Item>

type NoParamsObservableInputSource<Item> = () => ObservableInput<Item>
type NoParamsAsyncGeneratorSource<Item> = () => AsyncIterable<Item>
export type NoParamsFxSource<Item> =
  | NoParamsObservableInputSource<Item>
  | NoParamsAsyncGeneratorSource<Item>

type ObservableInputSource<Item, Params> = (params: Params) => ObservableInput<Item>
type AsyncGeneratorSource<Item, Params> = (params: Params) => AsyncIterable<Item>

export type FxSource<Item, Params> =
  | ObservableInputSource<Item, Params>
  | AsyncGeneratorSource<Item, Params>

const isAsyncIterable = <Item>(obj: AsyncIterable<Item> | any): obj is AsyncIterable<Item> =>
  Symbol.asyncIterator in obj && typeof obj[Symbol.asyncIterator] === 'function'

const wrapAsyncIterable = <Item>(asyncIterable: AsyncIterable<Item>): Observable<Item> =>
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

const wrapSource = <Item, Params = undefined>(
  source: FxSource<Item, Params>,
): ObservableFn<Item, Params> => (params: Params) => {
  const fxAbstraction = source(params)
  return isAsyncIterable(fxAbstraction) ? wrapAsyncIterable(fxAbstraction) : $from(fxAbstraction)
}

export type FxActionType = 'SUBSCRIBE' | 'NEXT' | 'ERROR' | 'COMPLETE' | 'UNSUBSCRIBE' | 'DESTROY'

interface FxMeta {
  prefix: string
  fxType: FxActionType
  id: string
}

export interface FxAction<Payload> extends AnyAction {
  type: string
  payload: Payload
  fx: FxMeta
}

export const isFxAction = <Payload = any>(action: AnyAction): action is FxAction<Payload> =>
  'fx' in action

export interface FxActionCreator<Payload> {
  (payload: Payload): FxAction<Payload>
  type: string
  fxType: FxActionType
  prefix: string
  match: (action: AnyAction) => action is FxAction<Payload>
}

export interface EmptyFxActionCreator {
  (params?: undefined): FxAction<undefined>
  type: string
  fxType: FxActionType
  prefix: string
  match: (action: AnyAction) => action is FxAction<undefined>
}

export interface FxActionCreators<Item, Params = undefined> {
  prefix: string
  subscribe: FxActionCreator<Params>
  next: FxActionCreator<Item>
  error: FxActionCreator<any>
  complete: EmptyFxActionCreator
  unsubscribe: EmptyFxActionCreator
  destroy: EmptyFxActionCreator
  selector: (state: FxSlice) => FxState<Item, Params>
}

export interface NoParamsFxActionCreators<Item> extends FxActionCreators<Item> {
  subscribe: EmptyFxActionCreator
}

export const isEmptyFxActionCreator = (
  actionCreator: FxActionCreator<any>,
): actionCreator is EmptyFxActionCreator => !!actionCreator.length

export interface FxActionMatchers<Item, Params = void> {
  subscribe: (action: AnyAction) => action is FxAction<Params>
  next: (action: AnyAction) => action is FxAction<Item>
  error: (action: AnyAction) => action is FxAction<any>
  complete: (action: AnyAction) => action is FxAction<void>
  unsubscribe: (action: AnyAction) => action is FxAction<void>
  destroy: (action: AnyAction) => action is FxAction<void>
}

export interface FxActionCreatorsFactory<Item, Params> {
  (id?: string): FxActionCreators<Item, Params>
  matchers: FxActionMatchers<Item, Params>
}
export interface NoParamsFxActionCreatorsFactory<Item> {
  (id?: string): NoParamsFxActionCreators<Item>
  matchers: FxActionMatchers<Item>
}

interface ForId extends MemoizedFunction {
  (id: string): FxActionCreators<any, any>
}
interface PrefixEntry {
  forId: ForId
  source: ObservableFn<any, any>
}
interface PrefixMap {
  [prefix: string]: PrefixEntry
}
const prefixMap: PrefixMap = {}

const prefixNotFoundError = (header: string, action: FxAction<any>) =>
  // tslint:disable-next-line:no-console
  console.error(
    `${header}: An FxAction was dispatched that was created by something other than an fxActionCreatorsFactory.`,
    'Only actions created through the factory can be managed by FxState. This action will be ignored.',
    action,
  )

const fxActionCreatorFactory = (prefix: string) => <Payload>(fxType: FxActionType) => {
  const type = `FX/${prefix}/${fxType}`
  const actionCreator = (id: string, payload: Payload) => ({
    type,
    payload,
    fx: { prefix, fxType, id },
  })
  const match = (action: AnyAction): action is FxAction<Payload> =>
    isFxAction(action) && action.fx.prefix === prefix && action.fx.fxType === fxType
  return Object.assign(
    (id: string): FxActionCreator<Payload> =>
      Object.assign((payload: Payload) => actionCreator(id, payload), {
        type,
        prefix,
        fxType,
        match: (action: AnyAction): action is FxAction<Payload> =>
          match(action) && action.fx.id === id,
      }),
    { match },
  )
}

// TODO a better name for this?
function fxActionCreatorsFactory<Item>(
  prefix: string,
  source: NoParamsFxSource<Item>,
): NoParamsFxActionCreatorsFactory<Item>
function fxActionCreatorsFactory<Item, Params>(
  prefix: string,
  source: FxSource<Item, Params>,
): FxActionCreatorsFactory<Item, Params>
function fxActionCreatorsFactory<Item, Params>(
  prefix: string,
  source: FxSource<Item, Params> | NoParamsFxSource<Item>,
): FxActionCreatorsFactory<Item, Params> | NoParamsFxActionCreatorsFactory<Item> {
  const fxacf = fxActionCreatorFactory(prefix)
  const subscribe = fxacf<Params>('SUBSCRIBE')
  const next = fxacf<Item>('NEXT')
  const error = fxacf<any>('ERROR')
  const complete = fxacf<undefined>('COMPLETE')
  const unsubscribe = fxacf<undefined>('UNSUBSCRIBE')
  const destroy = fxacf<undefined>('DESTROY')
  const matchers = {
    subscribe: subscribe.match,
    next: next.match,
    error: error.match,
    complete: complete.match,
    unsubscribe: unsubscribe.match,
    destroy: destroy.match,
  }
  const forId: ForId = memoize((id: string) => ({
    prefix,
    id,
    subscribe: subscribe(id),
    next: next(id),
    error: error(id),
    complete: complete(id),
    unsubscribe: unsubscribe(id),
    destroy: destroy(id),
    // return initial, in case they try to use the selector again after destroy()
    selector: (state: FxSlice) => state.fx[id] || initialFxState,
  }))
  prefixMap[prefix] = {
    forId,
    source: wrapSource(source),
  }
  return Object.assign((id: string = uuid()) => forId(id), { matchers })
}

export { fxActionCreatorsFactory }

const subscribeReducer: Reducer<FxState<any, any>> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'SUBSCRIBE'
    ? {
        ...state,
        status: 'subscribing',
        params: action.payload || null,
        data: null,
        error: null,
      }
    : state

const nextReducer: Reducer<FxState<any, any>> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'NEXT'
    ? {
        ...state,
        status: 'subscribed',
        data: action.payload,
        error: null,
      }
    : state

const errorReducer: Reducer<FxState<any, any>> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'ERROR'
    ? {
        ...state,
        status: 'error',
        error: action.payload,
      }
    : state

const completeReducer: Reducer<FxState<any, any>> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'COMPLETE'
    ? {
        ...state,
        status: 'completed',
        error: null,
      }
    : state

const unsubscribeReducer: Reducer<FxState<any, any>> = (state = initialFxState, action) =>
  isFxAction(action) && action.fx.fxType === 'UNSUBSCRIBE' ? initialFxState : state

export const fxStateReducer = reduceReducers(
  subscribeReducer,
  nextReducer,
  errorReducer,
  completeReducer,
  unsubscribeReducer,
)

export const fxSliceReducer: Reducer<FxSlice> = (state = { fx: {} }, action) => {
  if (isFxAction(action)) {
    if (prefixMap[action.fx.prefix]) {
      const id = action.fx.id
      const nextState = { ...state, fx: { ...state.fx } }
      if (action.fx.fxType === 'DESTROY') {
        delete nextState.fx[id]
        prefixMap[action.fx.prefix].forId.cache.delete(id)
      } else {
        nextState.fx[id] = fxStateReducer(nextState.fx[id], action)
      }
      return nextState
    } else {
      prefixNotFoundError('FxState#fxReducer', action)
    }
  }
  return state
}

export { fxSliceReducer as fxReducer }

const isSubscribeAction = (action: AnyAction): action is FxAction<any> =>
  isFxAction(action) && action.fx.fxType === 'SUBSCRIBE'

export const fxEpic = (action$: Observable<AnyAction>): Observable<AnyAction> =>
  action$.pipe(
    $filter(isSubscribeAction),
    $mergeMap(action => {
      const prefixEntry = prefixMap[action.fx.prefix]
      if (prefixEntry) {
        const { forId, source } = prefixEntry
        const {
          next,
          error,
          complete,
          unsubscribe: { match: matchUnsubscribe },
          destroy: { match: matchDestroy },
        } = forId(action.fx.id)
        try {
          const $ = source(action.payload)
          return new Observable(subscriber => {
            const subscription = $.subscribe(
              data => subscriber.next(next(data)),
              err => subscriber.next(error(err)),
              () => subscriber.next(complete()),
            )
            action$
              .pipe(
                $filter(
                  (action: AnyAction): action is FxAction<any> =>
                    matchUnsubscribe(action) || matchDestroy(action),
                ),
              )
              .subscribe(() => subscription.unsubscribe())
          })
        } catch (err) {
          return $of(error(err))
        }
      } else {
        prefixNotFoundError('FxState#fxEpic', action)
        return $empty()
      }
    }),
  )

export const fxMiddleware: Middleware = () => {
  let action$next: Subscriber<AnyAction>['next']
  const action$: Observable<AnyAction> = new Observable(({ next }) => (action$next = next))
  fxEpic(action$)
  return next => action => {
    const result = next(action)
    action$next(action)
    return result
  }
}
