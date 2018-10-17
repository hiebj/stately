/** @module stately-reducers */
import { Reducer, Action } from 'redux'

/**
 * Creates a "namespace" for a reducer.
 * Given `Reducer<S>` and key `K`, returns a new reducer whose shape is `{ [K]: S }`.
 * 
 * ```
 * type box = <S, K>(reducer: Reducer<S>, key: K) => Reducer<{ [K]: S }>
 * ```
 *
 * For a working example, see `box.spec.ts`.
 */
const box = <S extends {}, K extends string | number, A extends Action>(
  reducer: Reducer<S>,
  key: K
): Reducer<{ [k in K]: S }, A> => (state, action) => ({
  [key]: reducer(state && state[key], action)
} as { [k in K]: S })

export default box
