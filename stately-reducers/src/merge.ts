/** @module stately-reducers */
import { Reducer } from 'redux'

/**
 * The `merge` composer is similar to {@link chain}, but each given reducer
 * is called in isolation - it is not given the returned states of the other reducers, and the final
 * state tree is collision-checked to ensure that shapes returned by one reducer do not overlap
 * with shapes returned by any other.
 *
 * The intended use case is to compose reducers which each assume complete ownership of their part of
 * a state tree, together creating a root state shape.
 *
 * For example:
 * ```
 * type A = { a: {} }
 * type B = { b: {} }
 * type X = { x: {} }
 * type Y = { y: {} }
 *
 * const reducer1: Reducer<A> = ...
 * const reducer2: Reducer<B> = ...
 * const reducer3: Reducer<X & Y> = ...
 *
 * const composed = merge(reducer1, reducer2, reducer3)
 *
 * // typeof composed: Reducer<{ a: {}, b: {}, x: {}, y: {} }>
 * ```
 *
 * In this way, it is similar to `combineReducers`, but rather than expecting all of the
 * "owned slices" of every integrated reducer to be defined by the store owner, each
 * reducer instead determines the slice(s) that it owns. This allows external libraries
 * to define reducers that can be integrated into your store without requiring you to
 * be aware of their desired "slice name(s)".
 *
 * When an action is dispatched, each of the reducers composed using this function is called
 * with the last state object that it returned. In practice, this means that every reducer is
 * treated as if it is the only reducer in the store - it will never receive state values returned
 * by any other reducer.
 *
 * The final state tree is composed by merging the returned states of each sub-reducer. The
 * merge is done in-order, and destructively. For that reason, reducers passed to `merge` should
 * **not** return any properties that are also returned by any other. This function will log an
 * error to the console if any overwrite is detected.
 *
 * If you find that you must compose reducers with overlapping state shapes and you cannot change them,
 * consider isolating one of them using ${@link box}. This will mean that components accessing
 * the state of the boxed reducer will need to unbox its state before using it.
 *
 * If you are defining a set of reducers that is intended to manage a shared subset of the state
 * tree, use the {@link chain} composer instead.
 *
 * For a working example of {@link chain}, {@link box}, and {@link merge} used together, see `merge.spec.ts`.
 */
export default function merge<S>(r1: Reducer<S>): Reducer<S>
export default function merge<S1, S2>(r1: Reducer<S1>, r2: Reducer<S2>): Reducer<S1 & S2>
export default function merge<S1, S2, S3>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
): Reducer<S1 & S2 & S3>
export default function merge<S1, S2, S3, S4>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
  r4: Reducer<S4>,
): Reducer<S1 & S2 & S3 & S4>
export default function merge<S1, S2, S3, S4, S5>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
  r4: Reducer<S4>,
  r5: Reducer<S5>,
): Reducer<S1 & S2 & S3 & S4 & S5>
export default function merge<S1, S2, S3, S4, S5, S6>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
  r4: Reducer<S4>,
  r5: Reducer<S5>,
  r6: Reducer<S6>,
): Reducer<S1 & S2 & S3 & S4 & S5 & S6>
export default function merge<S1, S2, S3, S4, S5, S6, S7>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
  r4: Reducer<S4>,
  r5: Reducer<S5>,
  r6: Reducer<S6>,
  r7: Reducer<S7>,
): Reducer<S1 & S2 & S3 & S4 & S5 & S6 & S7>
export default function merge<S1, S2, S3, S4, S5, S6, S7, S8>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
  r4: Reducer<S4>,
  r5: Reducer<S5>,
  r6: Reducer<S6>,
  r7: Reducer<S7>,
  r8: Reducer<S8>,
): Reducer<S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8>
export default function merge(...reducers: Array<Reducer<{}>>): Reducer<{}> {
  const prevStates = new Map<Reducer, {} | undefined>(
    reducers.map(reducer => [reducer, undefined] as [Reducer, undefined]),
  )
  const checkCollisions = collisionChecker(prevStates)
  return (state, action) => {
    let shouldCheckCollisions: boolean = false
    const nextRootState = reducers.reduce((nextRootState, nextReducer) => {
      // call each reducer with the previous state it returned and merge the states
      const prevSliceState = prevStates.get(nextReducer)
      const nextSliceState = nextReducer(
        typeof prevSliceState !== 'undefined' ? prevSliceState : state,
        action,
      )
      shouldCheckCollisions = !prevSliceState || checkShapeChanged(prevSliceState, nextSliceState)
      prevStates.set(nextReducer, nextSliceState)
      return Object.assign(nextRootState, nextSliceState)
    }, {})
    if (shouldCheckCollisions) {
      setTimeout(checkCollisions)
    }
    return nextRootState
  }
}

const checkShapeChanged = (shape1: {}, shape2: {}): boolean => {
  const keys1 = Object.keys(shape1)
  const keys2 = Object.keys(shape2)
  return keys1.length !== keys2.length || !!keys1.filter(key => !keys2.includes(key)).length
}

const collisionChecker = (statesMap: Map<Reducer, {} | undefined>) => () => {
  const keysToReducerNames = new Map<string, string>()
  let index = 0
  statesMap.forEach((sliceState, reducer) => {
    if (sliceState) {
      Object.keys(sliceState).forEach(key => {
        const reducerName = getReducerName(reducer, index)
        if (keysToReducerNames.has(key)) {
          consoleError(keysToReducerNames.get(key)!, reducerName, key)
        }
        keysToReducerNames.set(key, reducerName)
      })
    }
    index++
  })
}

const getReducerName = (reducer: Reducer, reducerIndex: number) =>
  reducer.name || `<reducer ${reducerIndex} (anonymous)>`

const consoleError = (reducerName1: string, reducerName2: string, key: string) => {
  // tslint:disable-next-line:no-console
  console.error(
    'stately-reducers:\n',
    `merge() conflict on key '${key}':\n`,
    `Two reducers were given to merge() that both return a value for ${key}.`,
    'This is not recommended, as the reducers are called in the order they are given and their states are merged destructively.',
    `${reducerName2} will overwrite the ${key} value returned by ${reducerName1}, because ${reducerName2} is later in the execution sequence.\n`,
    'Isolate the colliding reducers using box(), or use chain() for reducers that are intended to modify a shared state slice.',
  )
}
