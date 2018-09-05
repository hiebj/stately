import * as React from 'react'
import { Dispatch, Unsubscribe, Store } from 'redux'

import { Renderable, Omit } from './types'
import { StoreConsumer } from './StoreConsumer'
import weakMapMemoize from './weakMapMemoize'

export interface ConnectedProps<State, Derived> {
  store: Store<State>
  children: (derivedState: Derived, dispatch: Dispatch) => Renderable
  deriveState: (state: State) => Derived
}

interface ReplaceableState<State> {
  state: State
}

export class Connected<State, Derived = State> extends React.Component<
  ConnectedProps<State, Derived>,
  ReplaceableState<Derived>
> {
  static defaultProps = {
    deriveState: function<T>(x: T) {
      return x
    },
  }

  deriveState: (state: State) => Derived
  state: ReplaceableState<Derived>
  unsubscribe: Unsubscribe

  constructor(props: ConnectedProps<State, Derived>) {
    super(props)
    this.deriveState = weakMapMemoize(this.props.deriveState)
    this.state = { state: this.getDerivedState() }
    this.unsubscribe = this.props.store.subscribe(this.onStoreUpdate)
    // TODO handle props change? they really shouldn't ever...
    // could use derivedStateFromProps to bind these into state, maybe.
    // either that or spit warnings into the console...
  }

  replace(state: Derived) {
    this.setState({ state })
  }

  getDerivedState() {
    return this.deriveState(this.props.store.getState())
  }

  onStoreUpdate = () => {
    this.replace(this.getDerivedState())
  }

  render() {
    return this.props.children(this.state.state, this.props.store.dispatch)
  }

  componentDidMount() {
    this.onStoreUpdate()
  }

  componentWillUnmount() {
    this.unsubscribe()
  }
}

export class ContextConnected<State, Derived = State> extends React.Component<
  Omit<ConnectedProps<State, Derived>, 'store'>
> {
  static defaultProps = Connected.defaultProps
  render() {
    return (
      <StoreConsumer<State>>{store => <Connected {...this.props} store={store} />}</StoreConsumer>
    )
  }
}
