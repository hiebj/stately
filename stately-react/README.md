# stately-react

The point of this library is to allow you to painlessly bind state information and execution hooks for arbitrary side-effects into your React components.

Usage looks more or less like this:
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

The `effect` prop of [`<DeclarativeEffect>`](/stately-react/src/DeclarativeEffect.spec.tsx#L29) and [`<CallableEffect>`](/stately-react/src/CallableEffect.spec.tsx#L27) can handle _any asynchronous function_.

Check out the definition of [`Effect`](/stately-fx/src/effects.ts#L12) - it captures any function whose return type can be wrapped in an `Observable`, which is pretty much anything. That means `async function`, async generators (`async function*`), as well as any function that returns a `Promise` or `Observable`. It also works with synchronous functions that return normal values, although I don't know why you would do that.

The `<Context...Effect>` prefix in the tests just means that the component is pulling the `store` off of React 15 Context, using the [`<StoreConsumer>`](/stately-react/src/DeclarativeEffect.tsx#L141). Instead, you could use a plain `<...Effect>` and pass the store as a prop (probably coming from React 16 Context). In fact, you don't need a store at all - [the `store` prop is optional](/stately-react/src/DeclarativeEffect.tsx#L61). If you don't pass a `store`, the component will manage the side-effect's state using the React component's `setState()`. Redux is not a dependency of this library.

Hopefully soon I will add a more comprehensive README. For now your best bet is cloning the project and running:

```
npm install
npm build
npm docs
```

This will host a static TypeDoc site at `8080`. It is generated from JSDoc and TypeScript definitions, and currently limited, but you can at least see the API.

To dive into the API, start with the exports defined in [`index.ts`](/stately-react/src/index.ts).

When I write a real README I'll add the TypeDoc to GitHub pages.
