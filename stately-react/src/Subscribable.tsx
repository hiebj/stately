import * as React from 'react'
import { Dispatch, Unsubscribe, Store } from 'redux'

export interface StoreSubscriberProps<State> {
  //deriveState: (state: State) => Derived
  children: (derivedState: State, dispatch: Dispatch) => ReturnType<React.Component['render']>
}

export interface StoreContext<State> {
  StoreSubscription: React.ComponentType
  StoreSubscriber: React.ComponentType<StoreSubscriberProps<State>>
}

interface ReplaceableState<State> {
  state: State
}

export const createStoreContext = <State,>(store: Store<State>): StoreContext<State> => {
  const { Provider, Consumer } = React.createContext<State | null>(null)

  class StoreSubscription extends React.Component {
    state: ReplaceableState<State>
    unsubscribe: Unsubscribe

    constructor(props: {}) {
      super(props)
      this.state = { state: store.getState() }
      this.unsubscribe = store.subscribe(this.onStoreUpdate)
    }

    render() {
      return (
        <Provider value={this.state.state}>
          {this.props.children}
        </Provider>
      )
    }

    onStoreUpdate = () => {
      this.setState({ state: store.getState() })
    }

    componentDidMount() {
      this.onStoreUpdate()
    }

    componentWillUnmount() {
      this.unsubscribe()
    }
  }

  class StoreSubscriber extends React.Component<
    StoreSubscriberProps<State>,
    ReplaceableState<State>
  > {
    // static defaultProps = {
    //   deriveState: <S,>(state: S) => state
    // }

    render() {
      return (
        <Consumer>
          {state => state ?
            this.props.children(state, store.dispatch)
            : null}
        </Consumer>
      )
    }

    warnNoProvider() {
      console.warn(
        'stately-react:\n',
        '<StoreSubscriber> was used with no ancestral <StoreSubscription>.\n',
        'StoreSubscribers all share a single subscription to the Redux store for performance reasons,',
        'so they cannot function independently of a StoreSubscription.\n',
        'Make sure that there is a StoreSubscription component in the component tree (likely near the root).'
      )
    }
  }

  return {
    StoreSubscription,
    StoreSubscriber
  }  
}
