import { Reducer } from 'redux'

/**
 * Combine reducers in a way the gives each reducer the root of the state tree.
 * This works well for normalized state trees where each reducer owns a key in the state tree.
 * Modelled after https://github.com/acdlite/reduce-reducers, but if the root reducer is passed
 * with no state, the uninitialized state is passed to each reducer (rather than chaining) giving
 * each reducer a chance to initialize its own part of the state tree
 */
export default function reduceReducers<S>(r1: Reducer<S>): Reducer<S>
export default function reduceReducers<S1, S2>(r1: Reducer<S1>, r2: Reducer<S2>): Reducer<S1 & S2>
export default function reduceReducers<S1, S2, S3>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
): Reducer<S1 & S2 & S3>
export default function reduceReducers<S1, S2, S3, S4>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
  r4: Reducer<S4>,
): Reducer<S1 & S2 & S3 & S4>
export default function reduceReducers<S1, S2, S3, S4, S5>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
  r4: Reducer<S4>,
  r5: Reducer<S5>,
): Reducer<S1 & S2 & S3 & S4 & S5>
export default function reduceReducers<S1, S2, S3, S4, S5, S6>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
  r4: Reducer<S4>,
  r5: Reducer<S5>,
  r6: Reducer<S6>,
): Reducer<S1 & S2 & S3 & S4 & S5 & S6>
export default function reduceReducers<S1, S2, S3, S4, S5, S6, S7>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
  r4: Reducer<S4>,
  r5: Reducer<S5>,
  r6: Reducer<S6>,
  r7: Reducer<S7>,
): Reducer<S1 & S2 & S3 & S4 & S5 & S6 & S7>
export default function reduceReducers<S1, S2, S3, S4, S5, S6, S7, S8>(
  r1: Reducer<S1>,
  r2: Reducer<S2>,
  r3: Reducer<S3>,
  r4: Reducer<S4>,
  r5: Reducer<S5>,
  r6: Reducer<S6>,
  r7: Reducer<S7>,
  r8: Reducer<S8>,
): Reducer<S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8>
export default function reduceReducers(...reducers: Array<Reducer<object>>): Reducer<object> {
  return (currentState, action) =>
    currentState
      ? reducers.reduce((nextState, reducer) => reducer(nextState, action), currentState)
      : reducers.reduce(
          // Invoke each reducer with `undefined` rather than the result of the previous reducer in the pipe
          // This allows each reducer to initialize its own slice of the state tree
          (initialState, reducer) => Object.assign(initialState, reducer(undefined, action)),
          {},
        )
}
