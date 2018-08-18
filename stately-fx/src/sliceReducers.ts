import { Reducer, AnyAction } from 'redux'

/**
 * The function `sliceReducers` is a function that is like `chainReducers`, but each given reducer
 * is called as though it is completely unaware of, and separate from, every other.
 *
 * The intended use case is to compose reducers which each own one or more entire
 * slices of a state tree, but need to then be merged to share the same root state.
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
 * const composed = sliceReducers(reducer1, reducer2, reducer3)
 *
 * // typeof composed: Reducer<{ a: {}, b: {}, x: {}, y: {} }>
 * ```
 *
 * In this way, it is similar to combineReducers, but rather than expecting all of the
 * "owned slices" of every integrated reducer to be defined by the store owner, each
 * reducer instead determines the slice(s) that it owns. This allows external libraries
 * to define reducers that can be integrated into your store without requiring you to
 * be aware of their desired "slice name(s)".
 *
 * This means that when a series of reducers are composed using this function, each is
 * given the same "current state" object, regardless whether one of the other reducers
 * so far in the order has returned a modified state.
 *
 * States returned by each sub-reducer are then merged together in-order, destructively.
 * For that reason, reducers passed to sliceReducers should **not** modify the same
 * slice as any other; rather, each reducer should **completely own** its slice (or slices).
 *
 * This function will log a warning to the console if any overwrite is detected (e.g.
 * if the second reducer modifies the subset of the state tree as the first). If you
 * want to have several reducers manage the same subset of a state tree, you should use
 * `chainReducers` instead.
 *
 *
 * Note: This is the top-level of the various reducer utilities in this package. They can
 * all be composed together to manage complex state trees with simple functions.
 *
 * For example:
 * ```
 * type IsOpen = { open: boolean }
 * const openReducer: Reducer<IsOpen> = ...
 * const closeReducer: Reducer<IsOpen> = ...
 * const isOpenReducer: chainReducers(openReducer, closeReducer)
 * const isOpenSliceReducer: createSliceReducer({ isOpen: isOpenReducer })
 *
 * type User = { id: number; name: string }
 * const changeIdReducer: Reducer<User> = ...
 * const changeNameReducer: Reducer<User> = ...
 * const userReducer: chainReducers(changeIdReducer, changeNameReducer)
 * const userSliceReducer = createSliceReducer({ user: userReducer })
 *
 * const allReducers = sliceReducers(openCloseSliceReducer, userSliceReducer)
 *
 * // typeof allReducers: Reducer<{
 * //  isOpen: { open: boolean },
 * //  user: { id: number, name: string }
 * // }>
 * ```
 */
export default function sliceReducers<S>(r1: Reducer<S>): Reducer<S>
export default function sliceReducers<S1, S2>(r1: Reducer<S1>, r2: Reducer<S2>): Reducer<S1 & S2>
export default function sliceReducers<S1, S2, S3>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
): Reducer<S1 & S2 & S3>
export default function sliceReducers<S1, S2, S3, S4>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
  r4: Reducer<S4>,
): Reducer<S1 & S2 & S3 & S4>
export default function sliceReducers<S1, S2, S3, S4, S5>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
  r4: Reducer<S4>,
  r5: Reducer<S5>,
): Reducer<S1 & S2 & S3 & S4 & S5>
export default function sliceReducers<S1, S2, S3, S4, S5, S6>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
  r4: Reducer<S4>,
  r5: Reducer<S5>,
  r6: Reducer<S6>,
): Reducer<S1 & S2 & S3 & S4 & S5 & S6>
export default function sliceReducers<S1, S2, S3, S4, S5, S6, S7>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
  r4: Reducer<S4>,
  r5: Reducer<S5>,
  r6: Reducer<S6>,
  r7: Reducer<S7>,
): Reducer<S1 & S2 & S3 & S4 & S5 & S6 & S7>
export default function sliceReducers<S1, S2, S3, S4, S5, S6, S7, S8>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
  r4: Reducer<S4>,
  r5: Reducer<S5>,
  r6: Reducer<S6>,
  r7: Reducer<S7>,
  r8: Reducer<S8>,
): Reducer<S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8>
export default function sliceReducers(...reducers: Array<Reducer<{}>>): Reducer<{}> {
  return (state, action) =>
    state === undefined
      ? // initialize state for each slice reducer with "undefined"
        reducers.reduce(
          (accumulatedInitialState, nextReducer) =>
            reduceAndMergeAfterChecking(nextReducer, undefined, action, accumulatedInitialState),
          {},
        )
      : // give each slice reducer the same "current state"
        reducers.reduce(
          (accumulatedNextState, nextReducer) =>
            reduceAndMergeAfterChecking(nextReducer, state, action, accumulatedNextState),
          state,
        )
}

function reduceAndMergeAfterChecking<S extends {}>(
  nextReducer: Reducer<Partial<S>>,
  currentState: S | undefined,
  action: AnyAction,
  accumulatedState: Partial<S>,
) {
  const nextStateToMerge = nextReducer(currentState, action)
  for (const key of Object.keys(nextStateToMerge)) {
    if (
      key in accumulatedState &&
      accumulatedState[key as keyof S] !== nextStateToMerge[key as keyof S]
    ) {
      // tslint:disable-next-line:no-console
      console.warn(
        'sliceReducers:\n',
        'A reducer was given to `sliceReducers` that modifies the same subset of the state',
        'tree as a previous reducer. This is not recommended, as the states are merged',
        'destructively, so the state returned by the subsequent reducer will always override',
        'the state of the previous.\n',
        'If you have multiple reducers that are intended to share management of the same slice',
        'of a state tree, consider using `chainReducers` instead.',
      )
    }
  }
  return {
    ...(accumulatedState as {}),
    ...(nextStateToMerge as {}),
  }
}
