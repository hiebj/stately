import { Reducer, Action } from 'redux'

/**
 * "compartmentalizes" a reducer that manages a state shape, creating a "slice reducer".
 * Essentially, this assigns a given reducer to a "slice" of a root state.
 *
 * By way of analogy, **slice** is to **state-tree** as **table** is to **database**.
 * Intended to be used to create reducers that are then composed with `sliceReducers`.
 *
 * For a working example, see `box.spec.ts`.
 */
const box = <S extends { [k: string]: any }, A extends Action<any>>(
  reducerDict: { [K in keyof S]: Reducer<S[K]> },
): Reducer<S, A> => <S1 extends S>(
  state: S1 = {} as S1,
  action: A,
): S =>
  Object.keys(reducerDict).reduce((rootState: S1, ns: keyof S) => {
    const newState = reducerDict[ns](rootState && rootState[ns], action)
    return newState !== (state && state[ns])
      ? {
          ...(rootState as any),
          [ns]: newState,
        }
      : state
  }, state)

export default box
