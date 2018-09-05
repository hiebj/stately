import * as React from 'react'
import { Store } from 'redux'
import * as PropTypes from 'prop-types'

export interface StoreConsumerProps<State> {
  children: (store: Store<State>) => Renderable
}

export class StoreConsumer<State> extends React.Component<StoreConsumerProps<State>> {
  static contextTypes = {
    store: PropTypes.object,
  }
  store: Store<State> | null

  constructor(props: StoreConsumerProps<State>, context: { store?: Store<State> }) {
    super(props)
    this.store = context.store || null
    if (!this.store) {
      console.error(
        'StoreConsumer: Could not find `store` on `context`.',
        'Make sure that a Provider is used above StoreConsumer in the component tree to pass the store down on context.',
        'This component will not render.',
      )
    }
  }

  render() {
    return this.store ? this.props.children(this.store) : null
  }

  componentDidUpdate() {
    if (this.store !== this.context.store) {
      // tslint:disable-next-line:no-console
      console.error(
        'StoreConsumer: The Store reference passed to StoreConsumer via `context` has changed.',
        "The Store cannot be changed after a StoreConsumer's creation, as this is likely to cause undefined behavior or errors.",
      )
    }
  }
}
