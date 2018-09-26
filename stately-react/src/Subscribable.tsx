import * as React from 'react'
import { Action } from 'redux'
import { Subscription as RxSubscription } from 'rxjs'

import { SubjectLike, StoreLike, $fromStore } from 'stately-async/observables'
import { Subtract } from 'stately-async/subtraction';

export interface SubscriberProps<S, A = S> {
  children: (state: S, next: (next: A) => void) => React.ReactNode
}

export interface SubscriptionProps<S, A = S> {
  children: SubscriberProps<S, A>['children'] | React.ReactNode
}

export type Subscription<S, A = S> = React.ComponentType<SubscriptionProps<S, A>>
export type Subscriber<S, A = S> = React.ComponentType<SubscriberProps<S, A>>

export type SubscriberDecorator<S, A = S> = <D>(
    deriveProps: (state: S, next: (next: A) => void) => D
  ) => <P>(
    Component: React.ComponentType<P extends D ? P : D>
  ) => React.ComponentClass<Subtract<P, D>>

export interface SubscriptionContext<S, A> {
  Subscription: Subscription<S, A>
  Subscriber: Subscriber<S, A>
  subscriber: SubscriberDecorator<S, A>
}

export const createStoreContext = <S, A extends Action>(store: StoreLike<S, A>) =>
  createSubjectContext($fromStore(store), store.getState())

export const createSubjectContext = <S, A = S>(subject: SubjectLike<S, A>, initial: S): SubscriptionContext<S, A> => {
  const { Provider, Consumer } = React.createContext<S | undefined>(undefined)
  const subjectNext = subject.next.bind(subject)

  class Subscription extends React.Component<SubscriptionProps<S, A>> {
    state: { value: S }
    subscription: RxSubscription

    constructor(props: SubscriptionProps<S, A>) {
      super(props)
      this.state = { value: initial }
      this.subscription = subject.subscribe(this.onNext)
    }

    render() {
      const { value } = this.state
      return (
        <Provider value={value}>
          {typeof this.props.children === 'function' ?
            this.props.children(value, subjectNext)
            : this.props.children}
        </Provider>
      )
    }

    onNext = (value: S) => {
      this.setState({ value })
    }

    componentWillUnmount() {
      this.subscription.unsubscribe()
    }
  }

  class Subscriber extends React.Component<SubscriberProps<S, A>> {
    render() {
      return (
        <Consumer>
          {state =>
            typeof state === 'undefined' ? warnNoProvider()
            : this.props.children(state, subjectNext)}
        </Consumer>
      )
    }
  }

  const subscriber = <D,>(
    deriveProps: (state: S, next: (next: A) => void) => D
  ) => <P,>(
    Component: React.ComponentType<P extends D ? P : D>
  ): React.ComponentClass<Subtract<P, D>> => {
    class SubscriberComponent extends React.Component<Subtract<P, D>> {
      render(): React.ReactNode {
        return (
          <Consumer>
            {state =>
              typeof state === 'undefined' ? warnNoProvider()
              : <Component {...this.props} {...deriveProps(state, subjectNext)} />}
          </Consumer>
        )
      }
    }
    (SubscriberComponent as React.ComponentClass<Subtract<P, D>>).displayName = `subscriber(${Component.name || Component.displayName})`
    return SubscriberComponent
  }

  return {
    Subscription,
    Subscriber,
    subscriber
  }  
}

const warnNoProvider = () => {
  console.warn(
    'stately-react:\n',
    '<Subscriber> was used with no ancestral <Subscription>.',
    'Without a Subscription, a Subscriber will never receive data, and will therefore never render.\n',
    'Make sure that there is a Subscription component in the component tree above the Subscriber.'
  )
  return null;
}
