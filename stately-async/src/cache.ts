import { AsyncLifecycle } from './AsyncLifecycle'
import { AsyncOperation } from './AsyncOperation'

// TODO could this be made into a WeakMap cache and get rid of the 'destroy' action?

export interface Entry {
  actions: AsyncLifecycle<any, any>
  operation: AsyncOperation<any, any[]>
}
interface Cache {
  [uuid: string]: Entry | undefined
}
const byUuid: Cache = {}

export const get = (uuid: string) => byUuid[uuid]

export const set = <Data, Params extends any[]>(
  uuid: string,
  actions: AsyncLifecycle<Data, Params>,
  operation: AsyncOperation<Data, Params>,
) => {
  byUuid[uuid] = {
    actions,
    // have to widen the accepted parameters type
    operation: operation as AsyncOperation<any, any[]>,
  }
}

export const remove = (uuid: string) => {
  delete byUuid[uuid]
}
