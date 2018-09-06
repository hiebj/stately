import { Action } from 'redux'
import { v4 as uuid } from 'uuid'

import { FxSlice, FxState, initialFxState } from './FxState'
import { Effect, $fromEffect } from './effects'
import { set } from './cache'

/** A union type representing all of the possible `type` values for `FxAction`s. */
export type FxActionType = 'call' | 'data' | 'error' | 'complete' | 'destroy'

export interface FxMeta {
  effectName: string
  fxType: FxActionType
  id: string
}

/** A special type of action dispatched by this library, describing a state change in an `Effect`. */
export interface FxAction<Payload extends any[]> extends Action {
  type: string
  payload: Payload
  fx: FxMeta
}

/** Type guard to indicate whether a given action is an `FxAction`. */
export const isFxAction = (action: Action): action is FxAction<any[]> =>
  'fx' in action

/**
 * Type guard to indicate whether a given action is an `FxAction` with the given `FxActionType`.
 * May be used by a custom `Epic`; for example, one that handles `'data'` `FxAction`s.
 */
export const isFxActionOfType = (type: FxActionType) => (action: Action): action is FxAction<any[]> =>
  isFxAction(action) && action.fx.fxType === type

export interface BaseFxActionCreator<Payload extends any[]> {
  readonly id: string
  readonly type: string
  readonly fxType: FxActionType
  readonly effectName: string
  readonly match: (action: Action) => action is FxAction<Payload>
}

export interface FxActionCreator<Payload extends any[]> extends BaseFxActionCreator<Payload> {
  (...payload: Payload): FxAction<Payload>
}

/**
 * A factory for `FxAction`s linked to a unique "session" with a given `Effect`. (see `#fxActions`)
 * 
 * Most consumers will only ever use the `call`, `destroy`, and `selector` properties.
 * The rest are for internal use, but are part of the public API because some advanced use cases may leverage the additional metadata.
 * 
 * @property call Calls the given `Effect`, passing any parameters directly through
 * @property destroy Destroys the "session", removing the `FxState` for this `FxActionCreators` instance from the state tree
 * @property selector Given the root state of a Store (or Store-like construct) configured with `fxReducer`, returns the unique `FxState` for this `FxActionCreators` instance
 */
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

/**
 * A config object that can be passed to `#fxActions` instead of an `Effect`.
 * Allows advanced configuration for a given effect.
 * 
 * @property effect The `Effect` that will be represented by the returned `FxActionCreators`
 * @property effectName A `string` that will be used as the infix for the `type` property of created `FxActions`
 */
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
  const match = (action: Action): action is FxAction<Params> =>
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

/**
 * A factory function that will return a unique `FxActionCreators` instance for a given `Effect` (or `FxActionsConfig`).
 * 
 * Calling this function essentially creates a "session" for the given `Effect`.
 * Dispatching actions from the resulting `FxActionCreators` will only affect the `FxState` that is allotted for this "session".
 * Internally, this is achieved by generating a `uuid` for each "session", which is used by `fxReducer` as a key in a `<uuid, FxState>` map.
 *
 * This allows many discrete "sessions" to exist for a single `Effect`, so that e.g. many different component instances can call the same `Effect` with different parameters without colliding.
 * To retrieve the unique `FxState` allotted for a given `FxActionCreators`, use the `#selector` with the root state of whatever Store (or Store-like construct) was configured with `fxReducer`.
 * 
 * Since each `FxActionCreators` is creating a "session" in your state tree, it is **important** that you clean up that session by dispatching the `#destroy` action.
 * Failure to do so will result in a memory leak, as `FxState` objects will remain in the state tree until they are destroyed, even if unused (unless the entire state tree goes out of scope).
 * For React components, a good practice is to dispatch the `#destroy` action in the component's `componentWillUnmount` hook.
 */
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
