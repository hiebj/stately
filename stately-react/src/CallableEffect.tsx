import * as React from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'

import { Effect, FxState, fxActions, FxSlice } from 'fx-state'
import { FxActionCreators, FxActionsConfig } from 'fx-state/actions'
import { FxActionsProps } from './withFxActions'

type CallableEffectChildren<Data, Params extends any[]> = (
  state: FxState<Data, Params>,
  call: (...params: Params) => void,
) => Renderable

interface InnerCallableEffectProps<Data, Params extends any[]>
  extends FxActionsProps<Data, Params> {
  children: CallableEffectChildren<Data, Params>
  state: FxState<Data, Params>
  call: (...params: Params) => void
  destroy: () => void
}

class InnerCallableEffect<Data, Params extends any[]> extends React.Component<
  InnerCallableEffectProps<Data, Params>
> {
  render() {
    const { children, state, call } = this.props
    return children(state, call)
  }

  componentWillUnmount() {
    this.props.destroy()
  }
}

const mapStateToProps = <Data, Params extends any[]>(
  state: FxSlice,
  { fxActions: { selector } }: FxActionsProps<Data, Params>,
) => ({ state: selector(state) })
const mapDispatchToProps = <Data, Params extends any[]>(
  dispatch: Dispatch,
  { fxActions: { call, destroy } }: FxActionsProps<Data, Params>,
) => ({
  call: (...params: Params) => {
    dispatch(call(...params))
  },
  destroy: () => {
    dispatch(destroy())
  },
})

type ConnectedProps = 'state' | 'call' | 'destroy'

const ConnectedCallableEffect = connect(
  mapStateToProps,
  mapDispatchToProps,
)(InnerCallableEffect)
ConnectedCallableEffect.displayName = 'InnerCallableEffect'

export interface CallableEffectProps<Data, Params extends any[]> {
  effect: Effect<Data, Params> | FxActionsConfig<Data, Params>
  children: CallableEffectChildren<Data, Params>
}

type Props<Data, Params extends any[]> = CallableEffectProps<Data, Params>

/**
 * CallableEffect is a React render-prop component that injects FxState for any side effect into its children.
 * It gives the consumer control over when the side-effect is executed.
 * This can be used for user-initiated side-effect calls, such as submitting a search or deleting a record.
 * Each instance of a CallableEffect will own its own unique FxState and FxActions.
 * On unmount, the component will destroy its FxState, cleaning up after itself.
 * 
 * The following example initiates the given side-effect when the button is clicked.
 * While it is pending, it renders a loading indicator.
 * When it resolves, it renders the value given to `resolve()`.
 * If the Promise is rejected, it renders the error given to `reject()`.
 * 
 * @example
 * ```
 * // typeof effect: (p1: number, p2: string) => Promise<string>
 * 
 * <CallableEffect effect={effect}>
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
export class CallableEffect<Data, Params extends any[]> extends React.Component<
  Props<Data, Params>
> {
  fxActions: FxActionCreators<Data, Params>

  constructor(props: Props<Data, Params>) {
    super(props)
    this.fxActions = fxActions(props.effect)
  }

  render() {
    // connect() is the worst thing
    const CastConnectedCallableEffect = (ConnectedCallableEffect as any) as React.ComponentClass<
      Omit<InnerCallableEffectProps<Data, Params>, ConnectedProps>
    >
    return (
      <CastConnectedCallableEffect fxActions={this.fxActions}>
        {this.props.children}
      </CastConnectedCallableEffect>
    )
  }
}
