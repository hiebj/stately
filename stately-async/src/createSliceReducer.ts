import { Reducer, Action } from 'redux'

/**
 * "lifts" a reducer that manages a state shape into a "slice" reducer.
 * Essentially, this assigns a given reducer to a "slice" of a root state.
 * By way of analogy, a "slice" is a state-tree analog for a "table" in a relational database.
 * Intended to be used to create reducers that are then composed with `sliceReducers`.
 *
 * For example:
 * ```
 * type MyState = { someProp: string; otherProp: boolean }
 * 
 * const myStateReducer: Reducer<MyState> = ...
 * 
 * const myStateSliceReducer = createSliceReducer({
 *   myState: myStateReducer
 * })
 *
 * // typeof myStateSliceReducer: Reducer<{ myState: MyState }>
 * ```
 */
const createSliceReducer = <State extends { [k: string]: any }>(
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

export default createSliceReducer
