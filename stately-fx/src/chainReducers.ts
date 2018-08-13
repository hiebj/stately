import { Reducer } from 'redux'

/*
 * `chainReducers` is the naive implementation of a "reduce reducers" pattern.
 * 
 * The intended use case is to compose reducers which together manage a single slice of
 * a state tree. They all should accept, and return, the same shape.
 * 
 * You should use this in a situation where you want to write a single reducer to handle
 * a single action, but have multiple actions that affect a shared state shape in
 * different ways.
 * 
 * This can be preferential to avoid writing massive reducers using e.g. a `switch`
 * or complex, nested ternary matchers.
 * 
 * Naive example:
 * ```
 * type OpenClosed = { open: boolean }
 * const openReducer = (state: OpenClosed, action: AnyAction) =>
 *   action.type === 'OPEN' ? { open: true } : state
 * const closeReducer = (state: OpenClosed, action: AnyAction) =>
 *   action.type === 'CLOSE' ? { open: false } : state
 * const openCloseReducer = chainReducers(openReducer, closeReducer)
 * export default openCloseReducer
 * ```
 * 
 * Order matters in `chainReducers`. Essentially,
 * ```
 * chainReducers(reducer1, reducer2, reducer3) =>
 *   (state, action) => reducer3(reducer2(reducer1(state, action), action), action)
 * ```
 * 
 * If you want to compose multiple reducers that each handle separate slices of a state
 * tree, you should use `sliceReducers` instead.
 */
const chainReducers = <S extends {}>(...reducers: Array<Reducer<S>>): Reducer<S> => (
  state,
  action,
) =>
  reducers.reduce(
    (accumulatedState, nextReducer) =>
      Object.assign(accumulatedState, nextReducer(accumulatedState, action)),
    Object.assign({}, state),
  )

export default chainReducers
