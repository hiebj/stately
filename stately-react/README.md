# stately-react
[![npm](https://img.shields.io/npm/v/stately-react.svg?style=flat-square)](https://www.npmjs.com/package/stately-reducers)

This module contains type-safe components for simplifying React state management.

**[API Reference](https://hiebj.github.io/stately/modules/stately_react.html)**

**Usage Guides**
- [`Subscribable` Components](#subscribable-like-react-redux-but-better): Components that create type-safe subscriptions (e.g. to a Redux store)
  - [Standalone `<Subscription>`](#standalone-subscription)
  - [`<Subscription>` with `<Subscriber>`s](#subscription-with-subscribers)
  - [`The subscriber()` decorator](#the-subscriber-decorator)
- [`Async` Components](#async-components): Components that perform type-safe asynchronous operations and provide type-safe state updates (active, completed, error)
  - [Declarative `<Async>` operations](#declarative-async-operations)
  - [Reactive `<Async>` operations](#reactive-async-operations)
  - [`<Async>` operations with Redux](#async-operations-with-redux)
- [`Controllable` Components](#controllable-components): Components that use a reducer to manage internal state, or can defer their state to a controlling ancestor (e.g. a [`<Subscription>`](#standalone-subscription))
  - [`Controllable` Components with Redux](#controllable-components-with-redux)
  - [Implementing a `Controllable` component](#implementing-a-controllable-component)

## `Subscribable`: like `react-redux`, but better
`Subscribable` makes it easy to create components with type-checked data and Store subscriptions using the [Render Prop](https://reactjs.org/docs/render-props.html) design pattern.

`Subscribable` is designed to handle *any type of subscription*. By far the most common use case is subscription to a Redux store, so that is what I will describe here. To see more advanced use cases, e.g. subscribing directly to an RxJS `Subject`, check out the tests in [Subscribable.spec.tsx](/stately-react/src/Subscribable.spec.tsx).

The best way to show how `Subscribable` can be used is by example.

### Standalone `<Subscription>`
Using a `Subscription` component as a direct injection of state from a Redux store:
```
// store definition
import { createStoreContext } from 'stately-react'
export const store = createStore(...)
export const { Subscription } = createStoreContext(store)

// elsewhere...
<Subscription>
  {(state, dispatch) =>
    <div>
      {/* render something interesting with state and dispatch */}
    </div>}
</Subscription>
```

### `<Subscription>` with `<Subscriber>`s
Typically, you'll use the state of a Redux store or other subscription in many places throughout your application. For that, you'll want to incorporate the use of `<Subscriber>` descendants of the `<Subscription>` component:
```
// store definition
import { createStoreContext } from 'stately-react'
export const store = createStore(...)
export const { Subscription, Subscriber } = createStoreContext(myStore)

// In the root of your component tree:
const MyApp: React.SFC = () => (
  <Subscription>
    <div>
      {/* the rest of your app goes here */}
    </div>
  </Subscription>
)

// Somewhere, a descendant component:
const MyStateful: React.SFC = () => (
  <Subscriber>
    {(state, dispatch) =>
      <div>
        {/* render something interesting with state and dispatch */}
      </div>}
  </Subscriber>
)
```

### The `subscriber()` decorator
You probably already have components whose props come directly from a subscription to a Redux store. The module `react-redux` uses the `connect()` high-order component to inject store state into components via props. The `subscriber()` decorator is similar to `connect()`; however, since it was defined in the scope of your `Store` using `createStoreContext(myStore)`, it is capable of preserving type information, granting you confidence that you've mapped your state to props correctly:
```
// store definition
import { createStoreContext } from 'stately-react'
const store = createStore(...)
export const { Subscription, subscriber } = createStoreContext(store)

// Component with props from Redux
interface MyComponentProps {
  className: string,
  changeClassName: (newClass: string) => void
}

class MyComponent extends React.Component<MyComponentProps> { ... }

// Apply the decorator
const SubscriberMyComponent = subscriber(

  // Types are checked.
  (state, dispatch) =>
    ({
      className: state.className,
      changeClassName: (newClass: string) => { dispatch(changeClassNameAction(newClass)) }
    })

)(MyComponent)

// elsewhere...
const UsingMyComponent: React.SFC = () => (
  // `className` and `changeClassName` do not need to be provided. They have been provided by `subscriber()`.
  <SubscriberMyComponent />
)
```

## `Async` Components
`<Async>` and `<CallableAsync>` are [`Controllable` components](#controllable-components), meaning they can operate **either with or without** a Redux store backing them. If no `Store` is used, they will manage their own state internally using React's `setState()`.

In either case, the usage of the `<Async>` components is the same; see the [`<Async>`](#using-async-to-make-a-declarative-asynchronous-call) and [`<CallableAsync>`](#using-callableasync-to-make-an-imperative-asynchronous-call) examples below. The only difference in implementation is that integration with a `Store` requires that they are wrapped with an `<AsyncController>`. The process of using a `Controller` is described in the [`Controllable` components](#controllable-components) section.

Most use cases do not require that these components be integrated with a `Store`; they will function just fine on their own. Advanced use cases might require `Store` integration. Integrating `<Async>` with the store will also allow you to see the actions and state mutations as they are dispatched in real-time using the Redux DevTools, which can be useful for debugging.

### Declarative `<Async>` operations
`<Async>` is "declarative", meaning that the `params` are passed in as a prop and the operation is performed automatically. It should be used whenever a component needs asynchronously-loaded data to render, such as search results or an entity from a REST service.

This example uses `<Async>` to wrap a `<SearchResults>` component, handling the execution and state management of the asynchronous `doSearch` operation:
```
import { Async } from 'stately-react'
import { doSearch } from './search'

// type doSearch = (p1: number, p2: string) => Promise<SearchResults>

<Async operation={doSearch} params={[123, 'abc']}>{
  state =>
    <div>{
      state.error ? <ErrorMessage error={state.error} />

        : state.data ? <SearchResults results={state.data} />

        : state.status === 'active' ? <LoadingSpinner />

        : null
    }</div>
}</Async>
```

### Reactive `<Async>` operations
`<CallableAsync>` is "reactive", meaning that you can initiate the call programatically, usually in response to a user interaction event.

The following abbreviated example uses `<CallableAsync>` to invoke `save` when the button is clicked:
```
import { CallableAsync } from 'stately-react'
import { save } from './saveEntity'

// type save = (entity: Entity) => Promise

<CallableAsync operation={save}>{
  (state, callSave) =>
    <div>{
      state.error ? <ErrorMessage error={state.error} />

        : state.status === 'complete' ? <SuccessMessage message="Entity saved successfully" />

        : state.status === 'active' ? <LoadingSpinner />

        : null
    }<EntityForm onSubmit={(entity: Entity) => callSave(entity)} />
    </div>
}</CallableAsync>
```

### `<Async>` operations with Redux
`<Async>` is [`Controllable`](#controllable), so it can be integrated with a Redux store by providing `state` and `dispatch` to a parent `<AsyncController>`:
```
import { AsyncController, Async } from 'stately-react'
import { Subscription } from './store'

<Subscription>{
  (state, dispatch) =>
    <AsyncController state={state} dispatch={dispatch}>

      // Any component nested under the AsyncController
      <Async operation={doSearch} params={[123, 'abc']}>{
        (state) => ...
      }</Async>

    </AsyncController>
}</Subscription>
```

## `Controllable` components
`Controllable` components manage their internal state with actions and reducers, allowing you to create components that can be used with or without a Store connection or external state management.

[`Async` components](###async-operations-with-redux) are `Controllable`.

By default, `<Controllable>` components create their own internal `state` and `dispatch` wrapped around React's `setState` system. By providing an ancestral `<Controller>`, the consumer can provide a type-checked overriding `state` and `dispatch` that will be used instead. Any actions triggered by the child are passed to the given `dispatch`, and the component will render using the given `state`.

### `Controllable` components with Redux
Integrating a `Controllable` component with a Redux store is a two-step process.  
First, the `Store` must be configured with the component's `reducer` (and `middleware`, if present):

```
import { createStore, applyMiddleware } from 'redux'
import { merge } from 'stately-reducers'
import { createStoreContext } from 'stately-react'

import { controllableReducer, controllableMiddleware } from './MyControllable'
import { myReducer } from './myReducer'

export const store = createStore(
  merge(
    controllableReducer,
    myReducer
  ),
  // middleware is optional, can perform side effects
  applyMiddleware(controllableMiddleware)
)

export const { Subscription, Subscriber, subscriber } = createStoreContext(store)
```

Second, a `<Controller>` corresponding to the `<Controllable>` component must be placed somewhere in the component tree above a `<Controllable>` component in question. Every `Controllable` component must export a compatible `Controller`. For example, `<AsyncController>` is exported alongside `<Async>`.

See the [`<Async>` example](#async-operations-with-redux).

To take control of *all* `<Async>` components in your entire app, you might put this code at the root of your application:
```
import { Subscription } from './store'

<Subscription>{
  (state, dispatch) =>
    <AsyncController state={state} dispatch={dispatch}>

      {/* the rest of your app goes here */}

    </AsyncController>
}</Subscription>
```

Once you have integrated the `<Controller>`, you can manage the `<Controllable>` component's state however you wish. In the previous example, `Async` actions are now being dispatched through the `Store`, so you could, for example, create your own `reducer` to handle the `async/.../data` actions of an asynchronous call.

### Implementing a `Controllable` component

> "Wow! These `Controllable` components are great! That pattern would work perfectly for my module!"  
 -you, probably

It's pretty easy. `Controllable` components use React Context. To start with, you need to define `action`s and a `reducer` to manage the state of your component. Using `createControllableContext()`, you can then create a `Controllable`/`Controller` pair with the `reducer`. `<Controllable>` components can integrate middleware, as well:
```
import { createControllableContext } from 'stately-async'

const myReducer = ...

export const { MyController, MyControllable } = createControllableContext(myReducer, myMiddleware)
```

`<Controllable>` will provide an internally-managed `state` and `dispatch` utilizing the given `reducer`. Alternately, any parent consumer can use your `<Controller>` to pass in the `state` and `dispatch`. The children of the `<Controllable>` can use these to render and update the state:
```
const MyControllable: React.SFC<MyControllableProps> = props => (
  <Controllable>{

    // either coming from Controllable internally, or somewhere else!
    (state, dispatch) =>
      <div>
        {/* implement your wonderful and amazing component here */ }
      </div>

  }</Controllable>
)
```

Check out the implementation of [Async.tsx](/stately-react/src/Async.tsx) for inspiration.
