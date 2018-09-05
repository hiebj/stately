import * as React from 'react'
import { Dispatch, Reducer, Action } from 'redux'

interface ControlledProps<State extends {}> {
  state: State
  dispatch: Dispatch
}

export type ControllableProps<State extends {}> = {
  reducer: Reducer<State>
  children: (state: State, dispatch: Dispatch) => false | JSX.Element | null
} & (ControlledProps<State> | {})

export default class Controllable<State> extends React.Component<ControllableProps<State>, State> {
  currentState: State = {} as State

  constructor(props: ControllableProps<State>) {
    super(props)
    if ('dispatch' in this.props) {
      this.dispatch = this.props.dispatch
    }
    this.currentState = this.props.reducer(undefined as any, { type: '@@INIT' })
  }

  dispatch<A extends Action>(action: A) {
    this.setState(this.props.reducer(this.currentState, action))
    return action
  }

  render() {
    if ('dispatch' in this.props) {
      return this.props.children(this.props.state, this.props.dispatch)
    } else {
      return this.props.children(this.currentState, this.dispatch)
    }
  }

  componentDidUpdate() {
    if ('dispatch' in this.props && this.props.dispatch !== this.dispatch) {
      // tslint:disable-next-line:no-console
      console.error(
        'Controllable: Components should not switch from uncontrolled to controlled after initial construction. The `dispatch` prop passed to Controllable should never change.',
        this.props,
      )
      this.dispatch = this.props.dispatch
    }
  }
}
