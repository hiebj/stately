import { FxActionCreators } from './actions'
import { ObservableFn } from './effects'

export interface Entry {
  actions: FxActionCreators<any, any>
  effect: ObservableFn<any, any>
}
interface Cache {
  [uuid: string]: Entry | undefined
}
const byUuid: Cache = {}

export const get = (uuid: string) => byUuid[uuid]

export const set = (
  uuid: string,
  actions: FxActionCreators<any, any>,
  effect: ObservableFn<any, any>,
) => {
  byUuid[uuid] = {
    actions,
    effect,
  }
  // TODO check collision?
}

export const remove = (uuid: string) => {
  delete byUuid[uuid]
}

// could this be made into a WeakMap cache and get rid of the 'destroy' action?
