import { AsyncSessionManager } from './actions'
import { ObservableFunction } from './AsyncFunction'

// TODO could this be made into a WeakMap cache and get rid of the 'destroy' action?

export interface Entry {
  actions: AsyncSessionManager<any, any>
  effect: ObservableFunction<any, any>
}
interface Cache {
  [uuid: string]: Entry | undefined
}
const byUuid: Cache = {}

export const get = (uuid: string) => byUuid[uuid]

export const set = (
  uuid: string,
  actions: AsyncSessionManager<any, any>,
  effect: ObservableFunction<any, any>,
) => {
  byUuid[uuid] = {
    actions,
    effect,
  }
}

export const remove = (uuid: string) => {
  delete byUuid[uuid]
}
