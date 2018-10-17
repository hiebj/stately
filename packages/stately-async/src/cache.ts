/** @module stately-async */
import { AsyncLifecycle } from './AsyncLifecycle'

// TODO could this be made into a WeakMap cache and get rid of the 'destroy' action?

interface Cache {
  [uuid: string]: AsyncLifecycle<any, any> | undefined
}
const byUuid: Cache = {}

export const get = (uuid: string) => byUuid[uuid]

export const set = <Data, Params extends any[]>(
  uuid: string,
  lifecycle: AsyncLifecycle<Data, Params>
) => {
  byUuid[uuid] = lifecycle
}

export const remove = (uuid: string) => {
  delete byUuid[uuid]
}
