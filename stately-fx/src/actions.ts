import { AnyAction } from 'redux'
import { v4 as uuid } from 'uuid'

import { FxSlice, FxState, initialFxState } from './FxState'
import { Effect, $fromEffect } from './effects'
import { set } from './cache'

export type FxActionType = 'call' | 'data' | 'error' | 'complete' | 'destroy'

export interface FxMeta {
  effectName: string
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
  readonly effectName: string
  readonly match: (action: AnyAction) => action is FxAction<Payload>
}

export interface FxActionCreator<Payload extends any[]> extends BaseFxActionCreator<Payload> {
  (...payload: Payload): FxAction<Payload>
}

export interface FxActionCreators<Data, Params extends any[]> {
  readonly id: string
  readonly effectName: string
  readonly call: FxActionCreator<Params>
  readonly data: FxActionCreator<[Data]>
  readonly error: FxActionCreator<[any]>
  readonly complete: FxActionCreator<[]>
  readonly destroy: FxActionCreator<[]>
  readonly selector: (state: FxSlice) => FxState<Data, Params>
}

export interface FxActionsConfig<Data, Params extends any[]> {
  effect: Effect<Data, Params>
  effectName?: string
  // TODO errorResolver?: (error: any) => Err
}

function getConfig<Data, Params extends any[]>(
  effect: Effect<Data, Params> | FxActionsConfig<Data, Params>,
  id: string,
) {
  const config =
    typeof effect === 'function'
      ? {
          effect,
          effectName: effect.name,
        }
      : {
          ...effect,
          effectName: effect.effectName || effect.effect.name,
        }
  if (!config.effectName) {
    // tslint:disable-next-line:no-console
    console.warn(
      'fx-state:\n',
      '#fxActions was called with an anonymous side-effect function, and no `effectName` was provided.\n',
      'The action type will be derived using the FxActions uuid, which is ugly and non-descriptive.\n',
      'It is recommended that you either provide a non-anonymous Effect or provide a `effectName`.',
    )
    config.effectName = id
  }
  return config
}

const fxacf = <Params extends any[]>(
  id: string,
  effectName: string,
  fxType: FxActionType,
): FxActionCreator<Params> => {
  const type = `fx/${effectName}/${fxType}`
  const actionCreator = (...payload: Params) => ({
    type,
    payload,
    fx: { effectName, fxType, id },
  })
  const match = (action: AnyAction): action is FxAction<Params> =>
    isFxAction(action) &&
    action.fx.effectName === effectName &&
    action.fx.fxType === fxType &&
    // really, only checking the id is actually necessary
    action.fx.id === id
  return Object.freeze(
    Object.assign(actionCreator, {
      id,
      type,
      effectName,
      fxType,
      match,
    }),
  )
}

export const fxActions = <Data, Params extends any[]>(
  effectOrConfig: Effect<Data, Params> | FxActionsConfig<Data, Params>,
): FxActionCreators<Data, Params> => {
  const id = uuid()
  const { effect, effectName } = getConfig(effectOrConfig, id)
  const actions = Object.freeze({
    id,
    effectName,
    call: fxacf<Params>(id, effectName, 'call'),
    data: fxacf<[Data]>(id, effectName, 'data'),
    error: fxacf<any>(id, effectName, 'error'),
    complete: fxacf<[]>(id, effectName, 'complete'),
    destroy: fxacf<[]>(id, effectName, 'destroy'),
    selector: (state: FxSlice) => state.fx[id] || initialFxState,
  }) as FxActionCreators<Data, Params>
  set(id, actions, $fromEffect(effect))
  return actions
}
