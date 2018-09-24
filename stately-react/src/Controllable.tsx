import * as React from 'react'
import { Dispatch, Reducer, Middleware, Action } from 'redux';

import { Omit } from 'stately-async/subtraction';

export interface StateDispatchProps<State> {
  state: State
  dispatch: Dispatch
}

export type StateDispatchChildren<State> = (state: State, dispatch: Dispatch) => ReturnType<React.Component['render']>

export interface StateDispatchConsumerProps<State> {
  children: StateDispatchChildren<State>
}

export interface ControllableContext<State> {
  Controller: React.ComponentType<StateDispatchProps<State>>
  Controllable: React.ComponentType<StateDispatchConsumerProps<State>>
}

export const createControllableContext = <State,>(
  reducer: Reducer<State>,
  middleware?: Middleware
): ControllableContext<State> => {
  const { Provider, Consumer } = React.createContext<StateDispatchProps<State> | null>(null)

  class Controller extends React.Component<StateDispatchProps<State>> {
    render() {
      return (
        <Provider value={this.props}>
          {this.props.children}
        </Provider>
      )
    }
  }

  class Controllable extends React.Component<StateDispatchConsumerProps<State>, State> {
    constructor(props: StateDispatchConsumerProps<State>) {
      super(props)
      this.state = reducer(undefined, { type: '@@CONTROLLABLE' })
      if (middleware) {
        this.dispatch = middleware({
          dispatch: this.dispatch,
          getState: () => this.state
        })(this.dispatch)
      }
    }

    dispatch = <A extends Action>(action: A) => {
      this.setState(reducer(this.state, action))
      return action
    }
  
    render() {
      return (
        <Consumer>
          {(controller?) =>
            controller ? this.props.children(controller.state, controller.dispatch)
              : this.props.children(this.state, this.dispatch)}
        </Consumer>
      )
    }
  }
  return {
    Controller,
    Controllable
  }
}

export const composeController = <State, ParentProps extends StateDispatchConsumerProps<State>>(
  Parent: React.ComponentType<ParentProps>,
  Controller: React.ComponentType<StateDispatchProps<State>>
): React.ComponentType<Omit<ParentProps, 'children'>> =>
  (props) => (
    <Parent {...props}>
      {(state, dispatch) =>
        <Controller state={state} dispatch={dispatch}>
          {props.children}
        </Controller>}
    </Parent>
  )
