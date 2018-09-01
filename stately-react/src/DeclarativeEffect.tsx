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
