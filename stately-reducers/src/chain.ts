import { Reducer } from 'redux'

/**
 * The `chain` composer is nearly identical to the commonly-used `reduceReducers` composer.
 *
 * The intended use case is to compose reducers which together manage a single slice of
 * a state tree. They all should accept, and return, the same shape.
 *
 * An example use case is a situation where multiple actions affect a state shape in different ways.
 * This can be preferential to avoid writing reducers using e.g. a `switch`, or complex, nested ternary matchers.
 *
 * For example:
 * ```
 * type OpenClosed = { open: boolean }
 * const openReducer = (state: OpenClosed, action: Action) =>
 *   action.type === 'OPEN' ? { open: true } : state
 * const closeReducer = (state: OpenClosed, action: Action) =>
 *   action.type === 'CLOSE' ? { open: false } : state
 * const openCloseReducer = chain(openReducer, closeReducer)
 * export default openCloseReducer
 * ```
 *
 * Order matters in `chain`. Essentially,
 * ```
 * chain(reducer1, reducer2, reducer3)
 * ```
 * 
 * yields:
 * ```
 *   (state, action) => reducer3(reducer2(reducer1(state, action), action), action)
 * ```
 *
 * If you want to compose multiple reducers that each handle **separate** slices of a state
 * tree, you should use the {@link merge} composer instead.
 */
const chain = <S extends {}>(...reducers: Array<Reducer<S>>): Reducer<S> => (
  state,
  action,
) =>
  reducers.reduce(
    (accumulatedState, nextReducer) =>
      Object.assign(accumulatedState, nextReducer(accumulatedState, action)),
    Object.assign({}, state),
  )

export default chain
