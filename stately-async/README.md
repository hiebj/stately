# stately-async

One of the most common tasks in client-side applications is the execution and rendering of asynchronous operations. A client may request or update data via a REST endpoint, query an aggregation or search service, subscribe to a data stream, execute a remote task, or render a complex visualization.

All of these asynchronous tasks have a very similar lifecycle: they are called, data is emitted once or multiple times, and either the task is completed or an error is encountered. Typically, the code to manage this lifecycle is duplicated for every consumer.

How many times have you written `setState({ loading: true })`, or defined a `loadingReducer`?

This module provides functions and types that allow a consumer to create self-managing "lifecycles" for arbitrary asynchronous tasks. A lifecycle can be created for any asynchronous function, regardless of its parameter arity, output type, or underlying implementation.

It is implemented following the action/reducer pattern popularized by Redux, and is intended to work with Redux. Usage of Redux is not strictly necessary, and this module has no runtime dependencies on Redux.

## Usage
The following naïve React example would render a set of tweets for `'@myTwitterHandle'` and `'@yourTwitterHandle'`. The store configuration, `getTweets` definition, and store subscription code is omitted for clarity:

```
import store from './myStore'
import getTweets from './getTweets'
import { asyncLifecycle } from 'stately-async'

const lifecycle1 = asyncLifecycle(getTweets)
store.dispatch(lifecycle1.call('@myTwitterHandle'))

const lifecycle2 = asyncLifecycle(getTweets)
store.dispatch(lifecycle2.call('@yourTwitterHandle'))

const TweetsComponent = ({ state }) =>
  state.data ?
    <div className="tweets">
      {state.data.map(
        tweet =>
          <Tweet tweet={tweet} />
      )}
    </div> :
  state.error ?
    <div className="error">
      {String(state.error)}
    </div> :
  state.status === 'active' ?
    <div className="loading-spinner" /> :
    null

const AppComponent = () =>
  <main>
    <TweetsComponent state={lifecycle1.selector(store.getState())} />
    <TweetsComponent state={lifecycle2.selector(store.getState())} />
  </main>
```

For working examples, check out the tests. In particular, [`middleware.spec.ts`](/stately-async/src/middleware.spec.ts) contains integration tests, configuring and dispatching actions to a real Store.

For API docs, follow the instructions in [the top-level README](https://github.com/hiebj/stately/).
