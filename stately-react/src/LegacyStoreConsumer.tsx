import * as React from 'react'
import { Store } from 'redux'
import * as PropTypes from 'prop-types'

import { Omit } from 'stately-async/subtraction';

import { StoreConsumerProps, StoreConsumer } from './StoreConsumer'

export class LegacyStoreConsumer<State> extends React.Component<Omit<StoreConsumerProps<State>, 'store'>> {
  static contextTypes = {
    store: PropTypes.object,
  }
  store: Store<State> | null

  constructor(props: StoreConsumerProps<State>, context: { store?: Store<State> }) {
    super(props)
    this.store = context.store || null
    if (!this.store) {
      console.error(
        'stately-react:\n',
        'LegacyStoreConsumer: Could not find `store` on `context`.',
        'Make sure that a Provider is used above LegacyStoreConsumer in the component tree to pass the store down on context.',
        'This component will not render.',
      )
    }
  }

  render() {
    return (
      this.store ? 
        <StoreConsumer store={this.store}>
          {this.props.children}
        </StoreConsumer>
        : null
    )
  }
}
