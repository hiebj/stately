import * as React from 'react'
import { Dispatch, Unsubscribe, Store } from 'redux'
import { StoreConsumer } from './StoreConsumer'

export interface ConnectedProps<State, Derived> {
  store: Store<State>
  children: (derivedState: Derived, dispatch: Dispatch) => Renderable
  deriveState: (state: State) => Derived
}

interface ConnectedState<Derived> {
  state: Derived | null
}

const shallowEquals = (
  v: { [k: string]: any; [k: number]: any },
  o: { [k: string]: any; [k: number]: any },
) => {
  for (const key in v) {
    if (!(key in o) || v[key] !== o[key]) {
      return false
    }
  }
  for (const key in o) {
    if (!(key in v) || v[key] !== o[key]) {
      return false
    }
  }
  return true
}

export class Connected<State, Derived = State> extends React.Component<
  ConnectedProps<State, Derived>,
  ConnectedState<Derived>
> {
  static defaultProps = {
    deriveState: function<S>(s: S) {
      return s
    },
  }
  unsubscribe?: Unsubscribe
  state: ConnectedState<Derived> // replaceState

  constructor(props: ConnectedProps<State, Derived>) {
    super(props)
    this.state = { state: this.getDerivedState() }
  }

  getDerivedState() {
    if (this.props.store) {
      const nextState = this.props.store.getState()
      return this.props.deriveState!(nextState)
    } else {
      return null
    }
  }

  onStoreUpdate = () => {
    const nextState = this.getDerivedState()
    if (nextState && !shallowEquals(this.state, nextState)) {
      this.setState({ state: nextState })
    }
  }

  render() {
    const { store } = this.props
    if (store && this.state.state) {
      return this.props.children(this.state.state, store.dispatch)
    } else {
      return null
    }
  }

  componentDidMount() {
    if (this.props.store) {
      this.unsubscribe = this.props.store.subscribe(this.onStoreUpdate)
      this.onStoreUpdate()
    }
  }

  componentWillUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
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
