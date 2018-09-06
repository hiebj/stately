# stately-react

Hopefully soon I will add a README with examples. For now your best bet is cloning the project and running:

```
npm install
npm build
npm docs
```

This will host a static TypeDoc site at `8080`. It is generated from JSDoc and TypeScript definitions, and currently limited, but you can at least see the API.

Start with the exports defined in [`index.ts`](/src/index.ts).

For (mocked) example usage, check the `spec.tsx` for the file in question; e.g. to see how to create a `<DeclarativeEffect>`, check out [`DeclarativeEffect.spec.tsx`](/src/DeclarativeEffect.spec.tsx).

When I write a real README I'll add the TypeDoc to GitHub pages.
