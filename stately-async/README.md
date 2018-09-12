# stately-async

One of the most common tasks in client-side applications is the execution and rendering of asynchronous operations. A client may request or update data via a REST endpoint, query an aggregation or search service, subscribe to a data stream, execute a remote task, or render a complex visualization.

All of these asynchronous tasks have a very similar lifecycle: they are called, data is emitted once or multiple times, and either the task is completed or an error is encountered. Typically, the code to manage this lifecycle is duplicated for every consumer.

How many times have you written `setState({ loading: true })`?

This module provides functions and types that allow a consumer to create self-managing "sessions" for arbitrary asynchronous tasks. These sessions represent the lifecycle described above for any asynchronous function, regardless of its parameter arity, output type, or underlying implementation.

It is implemented following the action/reducer pattern popularized by Redux, and is intended to work with Redux. Usage of Redux is not strictly necessary, and this library has no runtime dependencies on Redux.

## Example
The following naïve React example would render a set of tweets for `'@myTwitterHandle'` and `'@yourTwitterHandle'`. The store configuration, `getTweets` definition, and store subscription code is omitted for clarity:

```
import store from './myStore'
import getTweets from './getTweets'
import { createAsyncSession } from 'stately-async'

const sessionManager1 = createAsyncSession(getTweets)
store.dispatch(sessionManager1.call('@myTwitterHandle'))

const sessionManager2 = createAsyncSession(getTweets)
store.dispatch(sessionManager2.call('@yourTwitterHandle'))

const TweetsComponent = ({ session }) =>
  session.data ?
    <div className="tweets">
      {session.data.map(
        tweet =>
          <Tweet tweet={tweet} />
      )}
    </div> :
  session.error ?
    <div className="error">
      {String(session.error)}
    </div> :
  session.status === 'active' ?
    <div className="loading-spinner" /> :
    null

const AppComponent = () =>
  <main>
    <TweetsComponent session={sessionManager1.selector(store.getState())} />
    <TweetsComponent session={sessionManager2.selector(store.getState())} />
  </main>
```

A complete, working example will be added to this repository as soon as I get around to it.

## API
This project uses TypeDoc, which generates API documentation from TypeScript types and JSDoc. At some point, I'll host the TypeDoc on github pages; for now, you have to run it yourself:

```
npm install
npm build
npm docs
```

This will host a static TypeDoc site at `8080`.

For mocked, but working examples, check out the tests. In particular, [`middleware.spec.ts`](/stately-async/src/middleware.spec.ts) contains the best end-to-end examples, as it tests the entire lifecycle of an `AsyncSession` across multiple calls.
