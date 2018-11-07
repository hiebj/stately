# stately-react
[![npm](https://img.shields.io/npm/v/stately-react.svg?style=flat-square)](https://www.npmjs.com/package/stately-reducers)

This module contains components for simplifying the integration of state into React apps.

**[API Reference](https://hiebj.github.io/stately/modules/stately_react.html)**

**Usage Guides**
- [`Subscribable` Components](#subscribable-like-react-redux-but-better): Components that subscribe to things (like a Redux store, for instance)
- [`Async` Components](#async-components): Components that perform asynchronous operations and tell you how it's going (active, completed, error)
- [`Controllable` Components](#controllable-components): Components that manage their own state internally, unless you want to control it yourself

### `Subscribable`: like `react-redux`, but better
`Subscribable` comprises a set of components using React 16 Context that make the injection of subscription-based state management into your component tree much simpler. Unlike `react-redux` and `connect()`, these tools preserve the type of your `Store`. Additionally, they are designed using the [Render Prop](https://reactjs.org/docs/render-props.html) design pattern. There is plenty of information available about Render Props and their advantages, so I'll not spend time on that here.

`Subscribable` is designed to handle *any type of subscription*. By far the most common use case is subscription to a Redux store, so that is what I will describe here. To see more advanced use cases, e.g. subscribing directly to an RxJS `Subject`, check out the tests in [Subscribable.spec.tsx](/stately-react/src/Subscribable.spec.tsx).

The best way to show how `Subscribable` can be used is by example.

#### Standalone `<Subscription>`
The first example shows using a `Subscription` component as a one-time injection of state from a Redux store:
```
import { createStoreContext } from 'stately-react'
export const { Subscription } = createStoreContext(myStore)

// elsewhere...
<Subscription>
  {(state, dispatch) =>
    <div>
      {/* render something interesting with state and dispatch */}
    </div>}
</Subscription>
```

#### `<Subscription>` with `<Subscriber>`s
Typically, you'll use the state of a Redux store in many places throughout your application. For that, you'll want to incorporate the use of `<Subscriber>` descendants of the `<Subscription>` component. Each `<Subscriber>` receives the current state of the Redux store from the `<Subscription>` ancestor via React 16 Context, and will rerender whenever the `Store`'s state changes:
```
import { createStoreContext } from 'stately-react'
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

#### The `subscriber()` decorator
Sometimes, you already have a defined component that accepts props that can be taken directly from Redux state. If you're used to `react-redux`, this is the only pattern that you're familiar with. The `subscriber()` decorator is similar to `connect()`; however, since it was defined in the scope of your `Store` using `createStoreContext(myStore)`, it is capable of preserving type information, granting you confidence that you've mapped your state to props correctly:
```
import { createStoreContext } from 'stately-react'
export const { Subscription, subscriber } = createStoreContext(myStore)

// Defining a component
interface MyComponentProps { className: string, changeClassName: (newClass: string) => void }

class MyComponent extends React.Component<MyComponentProps> { ... }

const SubscriberMyComponent = subscriber(

  (state, dispatch) =>
      // Types are checked.
      // The type of `state` is known.
      // Only valid props of MyComponent can be returned.
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

### `Async` Components
`<Async>` and `<CallableAsync>` are [`Controllable` components](#controllable-components), meaning they can operate **either with or without** a Redux store backing them. If no `Store` is used, they will manage their own state internally using React's `setState()`.

In either case, the usage of the `<Async>` components is the same; see the [`<Async>`](#using-async-to-make-a-declarative-asynchronous-call) and [`<CallableAsync>`](#using-callableasync-to-make-an-imperative-asynchronous-call) examples below. The only difference in implementation is that integration with a `Store` requires that they are wrapped with an `<AsyncController>`. The process of using a `Controller` is described in the [`Controllable` components](#controllable-components) section.

Most use cases do not require that these components be integrated with a `Store`; they will function just fine on their own. Advanced use cases might require `Store` integration. Integrating `<Async>` with the store will also allow you to see the actions and state mutations as they are dispatched in real-time using the Redux DevTools, which can be useful for debugging.

#### Using `<Async>` to make a declarative asynchronous call
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

#### Using `<CallableAsync>` to make an imperative asynchronous call
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
        onClick={() => call(entity)}>
        Save
      </button>
    </div>}
</CallableAsync>
```

### `Controllable` components
`Controllable` components are components with two distinct modes for state management. They are either "uncontrolled", meaning that they are left to manage their own state internally, or "controlled", meaning that they dispatch their actions and receive their current state from an outside source. Generally, components should be left "uncontrolled" unless there is a reason to do otherwise, such as to implement custom action handling.

By using `Controllable` components, module developers can write components that are capable of managing their own state, while remaining flexible to any consumer who may wish to augment or modify their internal state workflows. [`Async` components](#async-components) are a good example: they maintain the state of their asynchronous operations internally by default, but can instead dispatch their actions to another action handler (e.g. a Redux `Store`), allowing the consumer to define special handling for their actions (such as `data`, `complete` or `error`).

#### Taking control
To put a `Controllable` component into "controlled" mode, an ancestral `<Controller>` of the right type must be provided. For example, `<Async>` exposes an `<AsyncController>` component:

```
<AsyncController state={state} dispatch={dispatch}>
  ...
    <Async operation={doSearch} params={[123, 'abc']}>
      ...
</AsyncController>
```

By providing an ancestral `<Controller>`, the consumer is assuming responsibility for managing the state of *all descendant `Controllable` components*. When a `Controllable` descendant of a `Controller` encounters a lifecycle event or user interaction that requires a state change, it will use the `Controller`'s `dispatch()` to emit the appropriate action. At that point, control is turned over to the consumer - it is your responsibility to affect state change (via reducers), invoke side effects (via epics or middleware), and finally, to pass the modified state back into the `Controller` via the `state` prop.

All `Controllable` components export a `reducer`, and if necessary, `middleware` that describe the "normal functioning" of the component. When no ancestral `Controller` is provided, that reducer and middleware are executed internally, and their results are applied to the component's own state via React's `setState()`. When an ancestral `Controller` is present, it is up to the consumer to use (or not to use) the exported reducer and middleware.

By providing a `Controller`, the consumer can manage the state of a `Controllable` however they wish. The most common use case for a `Controller` is to integrate them with a Redux store.

#### Configuring `Controllable` components to use a Redux Store
Integrating a `Controllable` component with a Redux store is a two-step process. First, the `Store` must be configured with the component's `reducer` (and `middleware`, if present):

```
import { createStore, applyMiddleware }
import { statelyAsyncReducer, statelyAsyncMiddleware } from 'stately-async'
// reduceReducers works too, but let's be honest, the types suck
import { mergeReducers } from 'stately-reducers'

import { myReducer } from './...'

export const store = createStore(
  mergeReducers(
    statelyAsyncReducer,
    myReducer
  ),
  applyMiddleware(statelyAsyncMiddleware)
)
```

Second, a `<Controller>` must be placed somewhere in the component tree above the `<Controllable>` component in question. Every `Controllable` component must export a compatible `Controller`. For example, `<AsyncController>` is exported alongside `<Async>`. (It works with `<CallableAsync>` too, since they share an implementation).

To take control of *all* `<Async>` components in your entire app, you might put this code at the root of your application:
```
const { Subscription } = createStoreContext(myStore)

<Subscription>
  {(state, dispatch) =>
    <AsyncController state={state} dispatch={dispatch}>
      {/* the rest of your app goes here */}
    </AsyncController>}
</Subscription>
```

You can provide the `<AsyncController>` with `state` and `dispatch` using [any of the methods](##subscribable-like-react-redux-but-better) described in the `Subscribable` section above. However you do it, any `Async` descendants will now dispatch actions to, and receive their state from your `Store`. Congratulations!

Presumably, you wanted to do something more, or else you'd have let `Async` manage its own state. What you do from here is up to you. Since all `Async` actions are now being dispatched through the `Store`, you could, for example, create your own `reducer` or `middleware` to handle `stately-async/myOperation/completed` actions in a special way. Maybe [at some point](https://en.wikipedia.org/wiki/Heat_death_of_the_universe) I'll have time to write a guide on how to do that.

#### Implementing a `Controllable` component

> "Wow! These `Controllable` components are great! That pattern would work perfectly for my module!"  
 -you, probably

It's pretty easy. `Controllable` components, just like `Subscribable`, use React 16 Context. To start with, you need to have a definition of the state you're trying to manage - specifically, you need a `reducer` and `Action`s to go with it. Once you have that done, you create a `Controllable`/`Controller` pair based around your `reducer`. If you have `middleware` for performing side effects, you'll want to include that too:
```
import { createControllableContext } from 'stately-async'

const { Controller, Controllable } = createControllableContext(myReducer, myMiddleware)
```

By giving the context your `reducer` and `middleware`, `<Controllable>` knows how to manage its own state internally. And that's pretty much it! To use it, just implement your component wrapped in the `<Controllable>`. If someone puts an instance of your `<Controller>` above you, they'll be providing the state/dispatch. Otherwise, `<Controllable>` will provide its own. Either way, you'll receive it as a render prop from `<Controllable>`:

```
const MyControllable: React.SFC<MyControllableProps> = props => (
  <Controllable>
    {(state, dispatch) =>
      <div>
        {/* implement your wonderful and amazing component here! */ }
      </div>}
  </Controllable>
)
```

Check out the implementation of [Async.tsx](/stately-react/src/Async.tsx) for inspiration.

That's all, folks! Message me if you have any questions!
