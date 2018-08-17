import { AnyAction } from 'redux'
import { v4 as uuid } from 'uuid'

import { FxSlice, FxState, initialFxState } from './FxState'
import { Effect, $fromEffect } from './effects'
import { set } from './cache'

export type FxActionType = 'call' | 'data' | 'error' | 'complete' | 'destroy'

export interface FxMeta {
  subtype: string
  fxType: FxActionType
  id: string
}

export interface FxAction<Payload extends any[]> extends AnyAction {
  type: string
  payload: Payload
  fx: FxMeta
}

export const isFxAction = <Payload extends any[]>(action: AnyAction): action is FxAction<Payload> =>
  'fx' in action

export const isCallFxAction = (action: AnyAction): action is FxAction<any> =>
  isFxAction(action) && action.fx.fxType === 'call'

export interface BaseFxActionCreator<Payload extends any[]> {
  readonly id: string
  readonly type: string
  readonly fxType: FxActionType
  readonly subtype: string
  readonly match: (action: AnyAction) => action is FxAction<Payload>
}

export interface FxActionCreator<Payload extends any[]> extends BaseFxActionCreator<Payload> {
  (...payload: Payload): FxAction<Payload>
}

export interface FxActionCreators<Item, Params extends any[]> {
  readonly id: string
  readonly subtype: string
  readonly call: FxActionCreator<Params>
  readonly data: FxActionCreator<[Item]>
  readonly error: FxActionCreator<[any]>
  readonly complete: FxActionCreator<[]>
  readonly destroy: FxActionCreator<[]>
  readonly selector: (state: FxSlice) => FxState<Item, Params>
}

export interface FxActionsConfig<Item, Params extends any[]> {
  effect: Effect<Item, Params>
  subtype?: string
  // TODO errorResolver?: (error: any) => Err
}

function getConfig<Item, Params extends any[]>(
  effect: Effect<Item, Params> | FxActionsConfig<Item, Params>,
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
    console.warn(
      'fx-state:\n',
      '#fxActions was called with an anonymous side-effect function, and no `subtype` was provided.\n',
      'The action type will be derived using the FxActions uuid, which is ugly and non-descriptive.\n',
      'It is recommended that you either provide a non-anonymous Effect or provide a `subtype`.',
    )
    config.subtype = id
  }
  return config
}

const fxacf = <Params extends any[]>(
  id: string,
  subtype: string,
  fxType: FxActionType,
): FxActionCreator<Params> => {
  const type = `fx/${subtype}/${fxType}`
  const actionCreator = (...payload: Params) => ({
    type,
    payload,
    fx: { subtype, fxType, id },
  })
  const match = (action: AnyAction): action is FxAction<Params> =>
    isFxAction(action) &&
    action.fx.subtype === subtype &&
    action.fx.fxType === fxType &&
    // really, only checking the id is actually necessary
    action.fx.id === id
  return Object.freeze(
    Object.assign(actionCreator, {
      id,
      type,
      subtype,
      fxType,
      match,
    }),
  )
}

function fxActions<Item, Params extends any[]>(
  effectOrConfig: Effect<Item, Params> | FxActionsConfig<Item, Params>,
): FxActionCreators<Item, Params> {
  const id = uuid()
  const { effect, subtype } = getConfig(effectOrConfig, id)
  const actions = Object.freeze({
    id,
    subtype,
    call: fxacf<Params>(id, subtype, 'call'),
    data: fxacf<[Item]>(id, subtype, 'data'),
    error: fxacf<any>(id, subtype, 'error'),
    complete: fxacf<[]>(id, subtype, 'complete'),
    destroy: fxacf<[]>(id, subtype, 'destroy'),
    selector: (state: FxSlice) => state.fx[id] || initialFxState,
  }) as FxActionCreators<Item, Params>
  set(id, actions, $fromEffect(effect))
  return actions
}

export { fxActions }
