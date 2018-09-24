import * as React from 'react'
import { Dispatch, Unsubscribe, Store } from 'redux'

export interface StoreConsumerProps<State> {
  store: Store<State>
  children: (state: State, dispatch: Dispatch) => ReturnType<React.Component['render']>
}

interface ReplaceableState<State> {
  state: State
}

export class StoreConsumer<State> extends React.Component<
  StoreConsumerProps<State>,
  ReplaceableState<State>
> {
  unsubscribe: Unsubscribe
  store: Store<State>

  constructor(props: StoreConsumerProps<State>) {
    super(props)
    this.store = props.store
    this.state = { state: props.store.getState() }
    this.unsubscribe = props.store.subscribe(this.onStoreUpdate)
  }

  onStoreUpdate = () => {
    this.setState({ state: this.props.store.getState() })
  }

  render() {
    return this.props.children(this.state.state, this.props.store.dispatch)
  }

  componentDidMount() {
    this.onStoreUpdate()
  }

  componentDidUpdate() {
    if (this.props.store !== this.store) {
      console.error(
        'StoreConsumer: The `store` prop passed to StoreConsumer has changed.',
        "The Store cannot be changed after a StoreConsumer's creation, as this is likely to cause undefined behavior or errors.",
      )
    }
  }

  componentWillUnmount() {
    this.unsubscribe()
  }
}
