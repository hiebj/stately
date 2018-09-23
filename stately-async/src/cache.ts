/**
 * Defines an internal cache that maps {@link AsyncLifecycle} instances by their uuid.
 * This is used by the {@link statelyAsyncEpic} to access the {@link AsyncOperation} and lifecycle action creators based on the `id` payload of dispatched {@link AsyncAction}s.
 * Do not manipulate this cache directly, or you will certainly break things.
 */

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
