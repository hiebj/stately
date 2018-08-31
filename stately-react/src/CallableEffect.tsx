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
