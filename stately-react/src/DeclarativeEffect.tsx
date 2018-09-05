import * as React from 'react'
import { Dispatch, Store } from 'redux'

import { Effect, FxState, fxActions, FxSlice, fxReducer } from 'fx-state'
import { FxActionCreators, FxActionsConfig } from 'fx-state/actions'
import { Connected } from './Connected'
import Controllable from './Controllable'
import { StoreConsumer } from './StoreConsumer'

type DeclarativeEffectChildren<Data, Params extends any[]> = (
  state: FxState<Data, Params>,
) => Renderable

interface DeclarativeEffectLifecycleProps<Data, Params extends any[]> {
  children: DeclarativeEffectChildren<Data, Params>
  params: Params
  state: FxState<Data, Params>
  call: (...params: Params) => void
  destroy: () => void
}

class DeclarativeEffectLifecycle<Data, Params extends any[]> extends React.Component<
  DeclarativeEffectLifecycleProps<Data, Params>
> {
  params: Params | null = null

  render() {
    const { children, state } = this.props
    return children(state)
  }

  componentDidMount() {
    this.maybeCall()
  }

  componentDidUpdate() {
    this.maybeCall()
  }

  maybeCall() {
    if (this.props.params !== this.params) {
      this.params = this.props.params
      this.props.call(...this.params)
    }
  }

  componentWillUnmount() {
    this.props.destroy()
  }
}

export interface DeclarativeEffectProps<Data, Params extends any[]> {
  effect: Effect<Data, Params> | FxActionsConfig<Data, Params>
  params: Params
  children: DeclarativeEffectChildren<Data, Params>
  store?: Store<FxSlice>
}

/**
 * DeclarativeEffect is a React render-prop component that injects FxState for any side effect into its children.
 * It executes the given side-effect on mount and when the given `params` change.
 * This can be used to render the results of a query, such as search results or a specific record.
 * Each instance of a DeclarativeEffect will own its own unique FxState and FxActions.
 * On unmount, the component will destroy its FxState, cleaning up after itself.
 * 
 * The following example initiates the given side effect when the component mounts.
 * While it is pending, it renders a loading indicator.
 * When it resolves, it renders the value that was passed to `resolve()`.
 * If the Promise is rejected, it renders the error that was passed to `reject()`.
 * 
 * @example
 * ```
 * // typeof effect: (p1: number, p2: string) => Promise<string>
 * 
 * <DeclarativeEffect effect={effect} params={[123, 'abc'] as [number, string]} store={store}>
 *   {state =>
 *     <div>
 *       {state.error ? <span className="error">{state.error}</span>
 *          : state.data ? <span className="response">{state.data}</span>
            : state.status === 'active' && <span className="loading" />}
 *     </div>}
 * </DeclarativeEffect>
 * ```
 */
// TODO with variadic generics, withFxActions could passthrough generics to this component.
// That would allow DeclarativeEffect to be rewritten as a SFC
// https://github.com/Microsoft/TypeScript/issues/5453
export class DeclarativeEffect<Data, Params extends any[]> extends React.Component<
  DeclarativeEffectProps<Data, Params>
> {
  fxActions: FxActionCreators<Data, Params>

  constructor(props: DeclarativeEffectProps<Data, Params>) {
    super(props)
    this.fxActions = fxActions(props.effect)
  }

  render() {
    const { selector, call, destroy } = this.fxActions
    const { params, store } = this.props
    const lifecycleDeclarativeEffect = (state: FxSlice, dispatch: Dispatch) => (
      <DeclarativeEffectLifecycle
        params={params}
        state={selector(state)}
        call={(...params: Params) => {
          dispatch(call(...params))
        }}
        destroy={() => {
          dispatch(destroy())
        }}
      >
        {this.props.children}
      </DeclarativeEffectLifecycle>
    )
    return store ? (
      <Connected store={store}>
        {(state, dispatch) => (
          <Controllable reducer={fxReducer} state={state} dispatch={dispatch}>
            {lifecycleDeclarativeEffect}
          </Controllable>
        )}
      </Connected>
    ) : (
      <Controllable reducer={fxReducer}>{lifecycleDeclarativeEffect}</Controllable>
    )
  }
}

/**
 * ContextDeclarativeEffect is identical to DeclarativeEffect, except that it uses StoreConsumer to pull the `store` prop off of Legacy React Context.
 */
export class ContextDeclarativeEffect<Data, Params extends any[]> extends React.Component<
  Omit<DeclarativeEffectProps<Data, Params>, 'store'>
> {
  render() {
    return (
      <StoreConsumer<FxSlice>>
        {store => <DeclarativeEffect {...this.props} store={store} />}
      </StoreConsumer>
    )
  }
}
