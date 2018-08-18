import { Reducer, AnyAction } from 'redux'

/**
 * "lifts" a reducer that manages a state shape into a "slice" reducer.
 *
 * For example:
 * ```
 * type A: { someProp: string; otherProp: boolean }
 * const reducerOfA: Reducer<A> = ...
 * const sliceReducerOfA = createSliceReducer({
 *   a: reducerOfA
 * })
 *
 * // typeof sliceReducerOfA: Reducer<{ a: A }>
 * ```
 */
const createSliceReducer = <State extends { [k: string]: any }>(
  reducerDict: { [K in keyof State]: Reducer<State[K]> },
): Reducer<State> => <RootState1 extends State>(
  state: RootState1 = {} as RootState1,
  action: AnyAction,
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
