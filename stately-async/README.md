# stately-async
[![npm](https://img.shields.io/npm/v/stately-async.svg?style=flat-square)](https://www.npmjs.com/package/stately-reducers)

This module contains types and functions for representing and managing the state of asynchronous operations. It is the underlying data API behind the [`<Async>` component](https://hiebj.github.io/stately/modules/stately_react.html#async-components) in `stately-react`.

**[API Reference](https://hiebj.github.io/stately/modules/stately_async.html)**

All asynchronous tasks have a similar lifecycle: they are called, data is emitted once or multiple times, and either the task is completed or an error is encountered. Typically, the code to manage this lifecycle is duplicated for every asynchronous action, whether it is done with epics, sagas, or component lifecycle.

This module provides functions and types that allow a consumer to use self-managing stateful "lifecycles" for arbitrary asynchronous tasks. A lifecycle can be created for any asynchronous function, regardless of its parameter arity, output type, or underlying implementation.

It is implemented following the action/reducer pattern, and is intended to work with Redux or any other state managment system that uses actions and reducers (such as [`<Controllable>` components](https://hiebj.github.io/stately/modules/stately_react.html#controllable-components).)

## Usage
Most asynchronous operations can be expressed declaratively using the [`<Async>` component](https://hiebj.github.io/stately/modules/stately_react.html#async-components), which is preferable to using this library directly. However, unusual or custom use cases may arise where it is ideal to create and use an `AsyncLifecycle` directly:

```
import store from './myStore'
import getTweets from './getTweets'
import { asyncLifecycle } from 'stately-async'

class TweetsComponent extends React.Component {
  constructor(props) {
    super(props)
    this.tweetsLifecycle = asyncLifecycle(getTweets)
  }
  
  render() {
    const { state } = this.props
    return state.data ? <TweetsView tweets={state.data} />
      : state.error ? <ErrorMessage error={state.error}>
      : state.status === 'active' ? <LoadingSpinner />
      : null
  }

  componentDidMount() {
    store.dispatch(this.tweetsLifecycle.call('@myTwitterHandle'))
  }

  componentDidUnmount() {
    store.dispatch(this.tweetsLifecylce.destroy())
  }
}
```
