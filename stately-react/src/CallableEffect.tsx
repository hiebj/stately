import * as React from 'react'
import { Store, Dispatch } from 'redux'

import {
  Effect,
  FxState,
  fxActions,
  FxSlice,
  FxActionCreators,
  FxActionsConfig,
  fxReducer,
} from 'fx-state'

import { Renderable, Omit } from './types'
import Controllable from './Controllable'
import { Connected } from './Connected'
import { StoreConsumer } from './StoreConsumer'

type CallableEffectChildren<Data, Params extends any[]> = (
  state: FxState<Data, Params>,
  call: (...params: Params) => void,
) => Renderable

interface LifecycleCallableEffectProps<Data, Params extends any[]> {
  children: CallableEffectChildren<Data, Params>
  state: FxState<Data, Params>
  call: (...params: Params) => void
  destroy: () => void
}

class LifecycleCallableEffect<Data, Params extends any[]> extends React.Component<
  LifecycleCallableEffectProps<Data, Params>
> {
  render() {
    const { children, state, call } = this.props
    return children(state, call)
  }

  componentWillUnmount() {
    this.props.destroy()
  }
}

export interface CallableEffectProps<Data, Params extends any[]> {
  effect: Effect<Data, Params> | FxActionsConfig<Data, Params>
  children: CallableEffectChildren<Data, Params>
  store?: Store<FxSlice>
}

/**
 * CallableEffect is a React render-prop component that injects FxState for any side effect into its children.
 * It gives the consumer control over when the side-effect is executed.
 * This can be used for user-initiated side-effect calls, such as submitting a search or deleting a record.
 * Each instance of a CallableEffect will own its own unique FxState and FxActions.
 * On unmount, the component will destroy its FxState, cleaning up after itself.
 * 
 * The following example initiates the given side-effect when the button is clicked.
 * While it is pending, it renders a loading indicator.
 * When it resolves, it renders the value that was passed to `resolve()`.
 * If the Promise is rejected, it renders the error that was passed to `reject()`.
 * 
 * @example
 * ```
 * // typeof effect: (p1: number, p2: string) => Promise<string>
 * 
 * <CallableEffect effect={effect} store={store}>
 *   {(state, call) =>
 *     <div>
 *       {state.error ? <span className="error">{state.error}</span>
 *          : state.data ? <span className="response">{state.data}</span>
            : state.status === 'active' && <span className="loading" />}
 *       <button onClick={() => call(123, 'abc')}>call effect</button>
 *     </div>}
 * </CallableEffect>
 * ```
 */
// TODO with variadic generics, withFxActions could passthrough generics to this component.
// That would allow CallableEffect to be rewritten as a SFC
// https://github.com/Microsoft/TypeScript/issues/5453
export class CallableEffect<Data, Params extends any[]> extends React.Component<
  CallableEffectProps<Data, Params>
> {
  fxActions: FxActionCreators<Data, Params>

  constructor(props: CallableEffectProps<Data, Params>) {
    super(props)
    this.fxActions = fxActions(props.effect)
  }

  render() {
    const { selector, call, destroy } = this.fxActions
    const { store } = this.props
    const lifecycleCallableEffect = (state: FxSlice, dispatch: Dispatch) => (
      <LifecycleCallableEffect
        state={selector(state)}
        call={(...params: Params) => {
          dispatch(call(...params))
        }}
        destroy={() => {
          dispatch(destroy())
        }}
      >
        {this.props.children}
      </LifecycleCallableEffect>
    )
    return store ? (
      <Connected store={store}>
        {(state, dispatch) => (
          <Controllable reducer={fxReducer} state={state} dispatch={dispatch}>
            {lifecycleCallableEffect}
          </Controllable>
        )}
      </Connected>
    ) : (
      <Controllable reducer={fxReducer}>{lifecycleCallableEffect}</Controllable>
    )
  }
}

/**
 * ContextCallableEffect is identical to CallableEffect, except that it uses StoreConsumer to pull the `store` prop off of Legacy React Context.
 */
export class ContextCallableEffect<Data, Params extends any[]> extends React.Component<
  Omit<CallableEffectProps<Data, Params>, 'store'>
> {
  render() {
    return (
      <StoreConsumer<FxSlice>>
        {store => <CallableEffect {...this.props} store={store} />}
      </StoreConsumer>
    )
  }
}
