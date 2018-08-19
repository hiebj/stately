export interface InitialFxState {
  status: null
  params: null
  data: null
  error: null
}

export interface ActiveFxState<Data, Params> {
  status: 'active'
  params: Params | null
  data: Data | null
  error: null
}

export interface ErrorFxState<Data, Params> {
  status: 'error'
  params: Params | null
  data: Data | null
  error: any
}

export interface CompletedFxState<Data, Params> {
  status: 'completed'
  params: Params | null
  data: Data
  error: null
}

export type FxState<Data, Params = undefined> =
  | InitialFxState
  | ActiveFxState<Data, Params>
  | ErrorFxState<Data, Params>
  | CompletedFxState<Data, Params>

export const initialFxState = Object.freeze({
  status: null,
  params: null,
  data: null,
  error: null,
}) as InitialFxState

export interface FxSlice {
  fx: { [key: string]: FxState<any, any> }
}
