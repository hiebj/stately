# stately-react

This module contains components that painlessly bind state information and execution hooks for arbitrary asynchronous operations into your React components.

## Usage
```
<CallableEffect effect={effect}>
  {(state, call) =>
    <div>
      {
        state.error ? <span className="error">{state.error}</span>
          : state.data ? <span className="response">{state.data}</span>
          : state.status === 'active' && <span className="loading" />
      }
      <button
        onClick={
          () => call(123, 'abc')
        }>
        Call the effect!
      </button>
    </div>}
</CallableEffect>
```

The `effect` prop of [`<DeclarativeEffect>`](/stately-react/src/DeclarativeEffect.spec.tsx#L60) and [`<CallableEffect>`](/stately-react/src/CallableEffect.spec.tsx#L43) can handle _any asynchronous function_.

Check out the definition of [`AsyncFunction`](/stately-async/src/AsyncFunction.ts#L22) - it captures any function whose return type can be wrapped in an `Observable`, which is pretty much anything. That means `async function`, async generators (`async function*`), as well as any function that returns a `Promise` or `Observable`. It also works with synchronous functions that return normal values, which can be useful for testing.

The `<Context...Effect>` prefix in the tests just means that the component is pulling the `store` off of React 15 Context, using the [`<StoreConsumer>`](/stately-react/src/DeclarativeEffect.tsx#L140). Instead, you could use a plain `<...Effect>` and pass the store as a prop (probably coming from React 16 Context). In fact, you don't need a store at all - [the `store` prop is optional](/stately-react/src/DeclarativeEffect.tsx#L60). If you don't pass a `store`, the component will manage the side-effect's state using the React component's `setState()`. This module has no runtime dependencies on Redux.

For more examples, check out the tests. For example, [DeclarativeEffect.spec.tsx](/stately-react/src/DeclarativeEffect.spec.tsx) contains a working example of a `DeclarativeEffect`.

For API docs, follow the instructions in [the top-level README](https://github.com/hiebj/stately/).
