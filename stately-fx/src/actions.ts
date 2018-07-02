import { AnyAction } from 'redux'
import { v4 as uuid } from 'uuid'

import { FxSlice, FxState, initialFxState } from './FxState'
import { Effect, NoParamsEffect, $fromEffect } from './effects'
import { set } from './cache'

export type FxActionType = 'SUBSCRIBE' | 'NEXT' | 'ERROR' | 'COMPLETE' | 'UNSUBSCRIBE' | 'DESTROY'

export interface FxMeta {
  subtype: string
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

export const isSubscribeFxAction = (action: AnyAction): action is FxAction<any> =>
  isFxAction(action) && action.fx.fxType === 'SUBSCRIBE'

export interface BaseFxActionCreator<Payload> {
  id: string
  type: string
  fxType: FxActionType
  subtype: string
  match: (action: AnyAction) => action is FxAction<Payload>
}

export interface FxActionCreator<Payload> extends BaseFxActionCreator<Payload> {
  (payload: Payload): FxAction<Payload>
}

export interface EmptyFxActionCreator extends BaseFxActionCreator<undefined> {
  (): FxAction<undefined>
}

export interface FxActionCreators<Item, Params = undefined> {
  readonly id: string
  readonly subtype: string
  readonly subscribe: FxActionCreator<Params>
  readonly next: FxActionCreator<Item>
  readonly error: FxActionCreator<any>
  readonly complete: EmptyFxActionCreator
  readonly unsubscribe: EmptyFxActionCreator
  readonly destroy: EmptyFxActionCreator
  readonly selector: (state: FxSlice) => FxState<Item, Params>
}

export interface NoParamsFxActionCreators<Item> extends FxActionCreators<Item> {
  readonly subscribe: EmptyFxActionCreator
}

export const isEmptyFxActionCreator = (
  actionCreator: FxActionCreator<any>,
): actionCreator is EmptyFxActionCreator => !!actionCreator.length

export interface FxActionsConfig<Item, Params> {
  effect: Effect<Item, Params>
  subtype?: string
  // TODO errorResolver?: (error: any) => Err
}

export interface NoParamsFxActionsConfig<Item> {
  effect: NoParamsEffect<Item>
  subtype?: string
  // TODO errorResolver?: (error: any) => Err
}

function getConfig<Item, Params>(
  effect:
    | NoParamsEffect<Item>
    | NoParamsFxActionsConfig<Item>
    | Effect<Item, Params>
    | FxActionsConfig<Item, Params>,
  id: string,
) {
  const config =
    typeof effect === 'function'
      ? {
          effect,
          subtype: effect.name,
        }
      : {
          ...effect,
          subtype: effect.subtype || effect.effect.name,
        }
  if (!config.subtype) {
    // tslint:disable-next-line:no-console
    console.error(
      'fx-state:\n',
      '#fxActions was called with an anonymous side-effect function, and no `subtype` was provided.\n',
      'The action type will be derived using the FxActions uuid, which is ugly and non-descriptive.\n',
      'It is recommended that you either provide a non-anonymous Effect or provide a `subtype`.',
    )
    config.subtype = id
  }
  return config
}

const fxacf = <Payload>(
  id: string,
  subtype: string,
  fxType: FxActionType,
): FxActionCreator<Payload> => {
  const type = `FX/${subtype}/${fxType}`
  const actionCreator = (payload: Payload) => ({
    type,
    payload,
    fx: { subtype, fxType, id },
  })
  const match = (action: AnyAction): action is FxAction<Payload> =>
    isFxAction(action) &&
    action.fx.subtype === subtype &&
    action.fx.fxType === fxType &&
    // really, only checking the id is necessary
    action.fx.id === id
  return Object.assign(actionCreator, {
    id,
    type,
    subtype,
    fxType,
    match,
  })
}

const selectorFactory = (id: string) =>
  function selector(state: FxSlice) {
    if (state.fx[id]) {
      return state.fx[id]
    } else {
      // tslint:disable-next-line:no-console
      console.error(
        'fx-state:\n',
        'FxActionCreators#selector was called, but no state was found the owning FxActionCreators.\n',
        'It is likely that the `destroy()` action has already been dispatched.\n',
        'The `intialFxState` is being returned, but using `selector` after `destroy` is unsupported.',
      )
      return initialFxState
    }
  }

function fxActions<Item>(
  effectOrConfig: NoParamsEffect<Item> | NoParamsFxActionsConfig<Item>,
): NoParamsFxActionCreators<Item>
function fxActions<Item, Params>(
  effectOrConfig: Effect<Item, Params> | FxActionsConfig<Item, Params>,
): FxActionCreators<Item, Params>
function fxActions<Item, Params>(
  effectOrConfig:
    | NoParamsEffect<Item>
    | NoParamsFxActionsConfig<Item>
    | Effect<Item, Params>
    | FxActionsConfig<Item, Params>,
): NoParamsFxActionCreators<Item> | FxActionCreators<Item, Params> {
  const id = uuid()
  const { effect, subtype } = getConfig(effectOrConfig, id)
  const actions = Object.freeze({
    id,
    subtype,
    subscribe: fxacf<Params>(id, subtype, 'SUBSCRIBE'),
    next: fxacf<Item>(id, subtype, 'NEXT'),
    error: fxacf<any>(id, subtype, 'ERROR'),
    complete: fxacf<undefined>(id, subtype, 'COMPLETE'),
    unsubscribe: fxacf<undefined>(id, subtype, 'UNSUBSCRIBE'),
    destroy: fxacf<undefined>(id, subtype, 'DESTROY'),
    selector: selectorFactory(id),
  }) as FxActionCreators<Item, Params>
  set(id, actions, $fromEffect(effect))
  return actions
}

export { fxActions }
