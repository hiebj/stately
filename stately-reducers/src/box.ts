import { Reducer, Action } from 'redux'

/**
 * "compartmentalizes" a reducer that manages a state shape, creating a "slice reducer".
 * Essentially, this assigns a given reducer to a "slice" of a root state.
 *
 * By way of analogy, **slice** is to **state-tree** as **table** is to **database**.
 * Intended to be used to create reducers that are then composed with `sliceReducers`.
 *
 * For example:
 * ```
 * type MyState = { someProp: string; otherProp: boolean }
 *
 * const myStateReducer: Reducer<MyState> = ...
 *
 * const myStateSliceReducer = box({
 *   myState: myStateReducer
 * })
 *
 * // typeof myStateSliceReducer: Reducer<{ myState: MyState }>
 * ```
 */
const box = <State extends { [k: string]: any }>(
  reducerDict: { [K in keyof State]: Reducer<State[K]> },
): Reducer<State> => <RootState1 extends State>(
  state: RootState1 = {} as RootState1,
  action: Action,
): State =>
  Object.keys(reducerDict).reduce((rootState: RootState1, ns: keyof State) => {
    const newState = reducerDict[ns](rootState && rootState[ns], action)
    return newState !== (state && state[ns])
      ? {
          ...(rootState as any),
          [ns]: newState,
        }
      : state
  }, state)

export default box
