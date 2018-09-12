# stately-react

The point of this library is to allow you to painlessly bind state information and execution hooks for arbitrary side-effects into your React components.

## Example
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

## Usage notes
The `effect` prop of [`<DeclarativeEffect>`](/stately-react/src/DeclarativeEffect.spec.tsx#L60) and [`<CallableEffect>`](/stately-react/src/CallableEffect.spec.tsx#L43) can handle _any asynchronous function_.

Check out the definition of [`AsyncFunction`](/stately-async/src/AsyncFunction.ts#L22) - it captures any function whose return type can be wrapped in an `Observable`, which is pretty much anything. That means `async function`, async generators (`async function*`), as well as any function that returns a `Promise` or `Observable`. It also works with synchronous functions that return normal values, which can be useful for testing.

The `<Context...Effect>` prefix in the tests just means that the component is pulling the `store` off of React 15 Context, using the [`<StoreConsumer>`](/stately-react/src/DeclarativeEffect.tsx#L140). Instead, you could use a plain `<...Effect>` and pass the store as a prop (probably coming from React 16 Context). In fact, you don't need a store at all - [the `store` prop is optional](/stately-react/src/DeclarativeEffect.tsx#L60). If you don't pass a `store`, the component will manage the side-effect's state using the React component's `setState()`. This library has no runtime dependencies on Redux.

## API
This project uses TypeDoc, which generates API documentation from TypeScript types and JSDoc. At some point, I'll host the TypeDoc on github pages; for now, you have to run it yourself:

```
npm install
npm build
npm docs
```

This will host a static TypeDoc site at `8080`.

For more examples, check out the tests. For example, [DeclarativeEffect.spec.tsx](/stately-react/src/DeclarativeEffect.spec.tsx) contains a working example of a `DeclarativeEffect`.
