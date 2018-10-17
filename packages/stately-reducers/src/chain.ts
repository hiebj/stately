/** @module stately-reducers */
import { Reducer } from 'redux'

/**
 * The `chain` composer is nearly identical to the commonly-used `reduceReducers` composer.
 * It behaves identically to the `pipe` function found in most functional programming libraries;
 * however, it constrains the input reducers by forcing them all to accept and return the same state shape.
 *
 * The intended use case is to compose reducers which together manage a single slice of a state tree.
 *
 * An example use case is a situation where multiple actions affect a state shape in different ways.
 * This can be preferential to avoid writing reducers using e.g. a `switch`, or complex, nested ternary matchers.
 *
 * If you want to compose multiple reducers that each handle **separate** slices of a state
 * tree, you should use the {@link merge} composer instead.
 *
 * For a working example, see `chain.spec.ts`.
 */
const chain = <S extends {}>(firstReducer: Reducer<S>, ...reducers: Reducer<S>[]): Reducer<S> => (
  state,
  action,
) =>
  reducers.reduce(
    (accumulatedState, nextReducer) =>
      accumulatedState ?
        Object.assign(accumulatedState, nextReducer(accumulatedState, action)) :
        nextReducer(accumulatedState, action),
    firstReducer(state, action),
  )

export default chain
