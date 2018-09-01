import * as React from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'

import { Effect, FxState, fxActions, FxSlice } from 'fx-state'
import { FxActionCreators, FxActionsConfig } from 'fx-state/actions'
import { FxActionsProps } from './withFxActions'

type DeclarativeEffectChildren<Data, Params extends any[]> = (
  state: FxState<Data, Params>,
) => Renderable

interface InnerDeclarativeEffectProps<Data, Params extends any[]>
  extends FxActionsProps<Data, Params> {
  children: DeclarativeEffectChildren<Data, Params>
  params: Params
  state: FxState<Data, Params>
  call: (...params: Params) => void
  destroy: () => void
}

class InnerDeclarativeEffect<Data, Params extends any[]> extends React.Component<
  InnerDeclarativeEffectProps<Data, Params>
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

const ConnectedDeclarativeEffect = connect(
  mapStateToProps,
  mapDispatchToProps,
)(InnerDeclarativeEffect)
ConnectedDeclarativeEffect.displayName = 'InnerDeclarativeEffect'

export interface DeclarativeEffectProps<Data, Params extends any[]> {
  effect: Effect<Data, Params> | FxActionsConfig<Data, Params>
  params: Params
  children: DeclarativeEffectChildren<Data, Params>
}

type Props<Data, Params extends any[]> = DeclarativeEffectProps<Data, Params>

/**
 * DeclarativeEffect is a React render-prop component that injects FxState for any side effect into its children.
 * It executes the given side-effect on mount and when the given `params` change.
 * This can be used to render the results of a query, such as search results or a specific record.
 * Each instance of a DeclarativeEffect will own its own unique FxState and FxActions.
 * On unmount, the component will destroy its FxState, cleaning up after itself.
 * 
 * The following complete example initiates the given side effect when the component mounts.
 * While it is pending, it renders a loading indicator.
 * When it resolves, it renders the value given to `resolve()`.
 * If the Promise is rejected, it renders the error given to `reject()`.
 * 
 * @example
 * ```
 * // typeof effect: (p1: number, p2: string) => Promise<string>
 * 
 * <DeclarativeEffect effect={effect} params={[123, 'abc'] as [number, string]}>
 *   {state =>
 *     <div>
 *       {state.error ? <span className="error">{state.error}</span>
 *          : state.data ? <span className="response">{state.data}</span>
            : state.status === 'active' && <span className="loading" />}
 *     </div>}
 * </DeclarativeEffect>
 * ```
 */
export class DeclarativeEffect<Data, Params extends any[]> extends React.Component<
  Props<Data, Params>
> {
  fxActions: FxActionCreators<Data, Params>

  constructor(props: Props<Data, Params>) {
    super(props)
    this.fxActions = fxActions(props.effect)
  }

  render() {
    // connect() is the worst thing
    const CastConnectedDeclarativeEffect = (ConnectedDeclarativeEffect as any) as React.ComponentClass<
      Omit<InnerDeclarativeEffectProps<Data, Params>, ConnectedProps>
    >
    return (
      <CastConnectedDeclarativeEffect fxActions={this.fxActions} params={this.props.params}>
        {this.props.children}
      </CastConnectedDeclarativeEffect>
    )
  }
}
