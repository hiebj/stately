# stately-react

This module contains components that painlessly bind state information and execution hooks for arbitrary asynchronous operations into your React components.

## Usage
The APIs for this module are "under construction", and so are the docs. [Eventually](https://en.wikipedia.org/wiki/Heat_death_of_the_universe) I will get the entire API posted up to GitHub pages. For now, these examples can help you get started. (I pulled them straight out of the JSDoc for these components).

**Using `<Async>` to make a declarative asynchronous call:**  
`<Async>` is "declarative", meaning that the `params` are passed in as a prop. It should be used whenever a component needs asynchronously-loaded data to render, such as search results or an entity from a REST service.

The following abbreviated example uses `<Async>` to wrap a `<SearchResults>` component, handling the execution and state management of the asynchronous `doSearch` call:
```
// type doSearch = (p1: number, p2: string) => Promise<SearchResults>

<Async operation={doSearch} params={[123, 'abc']}>
  {state =>
    <div>
      {
        // If the Promise is rejected, render the error.
        state.error ? <ErrorMessage error={state.error} />
          // If the Promise resolves, render the SearchResults.
          : state.data ? <SearchResults results={state.data} />
          // If the operation is active, render a loading indicator.
          : state.status === 'active' && <LoadingSpinner />
      }
    </div>}
</Async>
```

**Using `<CallableAsync>` to make an imperative asynchronous call:**  
`<CallableAsync>` is "imperative", meaning that you can initiate the call programatically, probably as a result of a user interaction, such as saving a form.

The following abbreviated example uses `<CallableAsync>` to invoke `save` when the button is clicked:
```
// type save = (entity: Entity) => Promise

<CallableAsync operation={save}>
  {(state, call) =>
    <div>
      {
        // If the Promise is rejected, render the error.
        state.error ? <span className="error">{state.error}</span>
          // If the Promise resolves, render a success message.
          : state.status === 'complete' ? <span className="success">Entity saved successfully.</span>
          // If the operation is active, render a loading indicator.
          : state.status === 'active' && <span className="loading" />
      }
      <button
        onClick={() => save(entity)}>
        Save
      </button>
    </div>}
</CallableAsync>
```

**Configuring Async components to use a Redux Store:**  
`<Async>` and `<CallableAsync>` are `Controllable` components, meaning they can operate either with or without a Redux store backing them. To use them without a Redux store, simply use them as they are shown above.

To integrate them with a Redux store, causing their state and actions to be managed by Redux, you need to configure their context with an `<AsyncController>`. An `<AsyncController>` placed anywhere in the component tree will integrate any `Async` descendants beneath it. For example, to cause *all* `Async` components to integrate with the Redux store, you might create a structure like this at the root of your app:
```
const { Subscription } = createStoreContext(myStore)

<Subscription>
  {(state, dispatch) =>
    <AsyncController state={state} dispatch={dispatch}>
      {/* the rest of your app goes here */}
    </AsyncController>}
</Subscription>
```

Another approach using the `subscriber()` decorator:
```
const { Subscription, subscriber } = createStoreContext(myStore)
const StoreAsyncController = subscriber((state, dispatch) => ({ state, dispatch }))(AsyncController)

<Subscription>
  <StoreAsyncController>
    {/* the rest of your app goes here */}
  </StoreAsyncController>
</Subscription>
```

If you already have a `<Provider>` at the root of your app, this will look very familiar. `<Provider>` uses React 15 Context API; `<Subscription>` is a React 16 Context tool.

`<Subscription>`, `<Subscriber>`, and the `subscriber()` decorator are still a work in progress, but are nearing completion. Documentation for `Controllable` and `Subscribable` will be coming soon.

For more information, check out the tests and the code:

- [Async.tsx](/stately-react/src/Async.tsx)
- [Async.spec.tsx](/stately-react/src/Async.spec.tsx)
- [CallableAsync.tsx](/stately-react/src/CallableAsync.tsx)
- [CallableAsync.spec.tsx](/stately-react/src/CallableAsync.spec.tsx)

For API docs, follow the instructions in [the top-level README](https://github.com/hiebj/stately/).
