# stately-react

The point of this library is to allow you to painlessly bind state information and execution hooks for arbitrary side-effects into your React components.

Note that for [`<DeclarativeEffect>`](/stately-react/src/DeclarativeEffect.spec.tsx#L29) and [`<CallableEffect>`](/stately-react/src/CallableEffect.spec.tsx#L27), the `effect` prop should be able to handle _any asynchronous function_.

Check out the definition of [`Effect`](/stately-fx/src/effects.ts#L12) - it captures any function whose return type can be wrapped in an `Observable`, which is pretty much anything. That means `async function`, async generators (`async function*`), as well as any function that returns a `Promise` or `Observable`. It also works with synchronous functions that return normal values, although I don't know why you would do that.

Hopefully soon I will add a README with examples. For now your best bet is cloning the project and running:

```
npm install
npm build
npm docs
```

This will host a static TypeDoc site at `8080`. It is generated from JSDoc and TypeScript definitions, and currently limited, but you can at least see the API.

Start with the exports defined in [`index.ts`](/stately-react/src/index.ts).

For (mocked) example usage, check the `spec.tsx` for the file in question; e.g. to see how to create a `<DeclarativeEffect>`, check out [`DeclarativeEffect.spec.tsx`](/stately-react/src/DeclarativeEffect.spec.tsx).

When I write a real README I'll add the TypeDoc to GitHub pages.
