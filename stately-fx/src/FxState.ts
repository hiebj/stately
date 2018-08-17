export interface InitialFxState {
  status: null
  params: null
  data: null
  error: null
}

export interface ActiveFxState<Item, Params> {
  status: 'active'
  params: Params | null
  data: Item | null
  error: null
}

export interface ErrorFxState<Item, Params> {
  status: 'error'
  params: Params | null
  data: Item | null
  error: any
}

export interface CompletedFxState<Item, Params> {
  status: 'completed'
  params: Params | null
  data: Item
  error: null
}

export type FxState<Item, Params = undefined> =
  | InitialFxState
  | ActiveFxState<Item, Params>
  | ErrorFxState<Item, Params>
  | CompletedFxState<Item, Params>

export const initialFxState = Object.freeze({
  status: null,
  params: null,
  data: null,
  error: null,
}) as InitialFxState

export interface FxSlice {
  fx: { [key: string]: FxState<any, any> }
}
