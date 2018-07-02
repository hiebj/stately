# fx-state

Types, actions, reducer, and middleware for managing the state of side-effects in Redux.

In JavaScript, most side-effects are acheived by conducting one or more asynchronous operations. The possible states of those operations are finite:

- `initial`: not started
- `subscribing`: started, awaiting initial response
- `subscribed`: initial response received
- `complete`: no more responses awaited
- `error`: something went wrong

Some asynchronous operations only have a subset of those states. For example, only subscription operations (`Observable`, `AsyncIterator`) use the `subscribed` state. For `Promise`-like (one-time) operations, the `subscribed` state is not relevant.

Tracking the state of these side effects is crucial to every application. Copy-paste or factory-implemented boilerplate around tracking these side effects is common. `typescript-fsa` attempts to solve this in part by providing `asyncActionCreators` to avoid recreating the same actions. However, `asyncActionCreators` only helps with `Promise`-like operations, and does not handle reflection in state or action sequencing.

This library attempts to provide a full solution, including an actions factory, reducer, and integrative middleware such that any asynchronous operation can be triggered, tracked, and consumed with the minimal amount of effort.

## Usage

### `myEffectActions.ts`

Create a set of action creators for a given side effect. Given `myEffect`, which is a valid [`FxSource`](#fxsourceitem-params):

```ts
import myEffect from './myEffect'
import { fxActionCreatorsFactory } from 'fx-state'

export default const myEffectActionsFactory = fxActionCreatorsFactory('MY_EFFECT', myEffect)
```

[These actions](#fxactioncreatorsitem-params) can now be dispatched by [any component](#mycomponent-tsx) to initiate the asynchronous operation and consume the result.

### `store.ts`

Integrate the reducer and middlware into your store.

**Use `fxMiddleware` if you're not using `redux-observable`:**

```ts
import { createStore, applyMiddleware } from 'redux'
import { fxReducer, reduceReducers, fxMiddleware } from 'fx-state'

import myReducer from './myReducer'

const reducer = reduceReducers(myReducer, fxReducer)
const store = createStore(reducer, {}, applyMiddleware(fxMiddleware))
```

**Use `fxEpic` if you _are_ using `redux-observable`:**

```ts
import { createStore, applyMiddleware } from 'redux'
import { combineEpics, createEpicMiddleware } from 'redux-observable'
import { fxReducer, reduceReducers, fxEpic } from 'fx-state'

import myReducer from './myReducer'
import myEpic from './myEpic'

const reducer = reduceReducers(myReducer, fxReducer)
const epics = combineEpics(myEpic, fxEpic)
const store = createStore(myReducer, {}, applyMiddleware(createEpicMiddleware(fxEpic)))
```

## API overview

**Note:** This is subject to name-changes and API tweaks in upcoming releases until stabilized.

### `FxState<Item, Params>`

```ts
type FxState<Item, Params> = {
  status: null | 'subscribing' | 'subscribed' | 'error' | 'completed'
  params: Params | null
  data: Item | null
  error: any | null
}
```

### `FxSource<Item, Params>`

Note that `ObservableInput` is anything that can be _converted_ to an Observable. Examples of a valid `FxSource`:

- `async function(params)`
- `async function*(params)`
- `(params) => Promise`
- `(params) => Observable`

```ts
type FxSource<Item, Params> =
  | (params?: Params) => ObservableInput<Item>
  | (params?: Params) => AsyncIterable<Item>
```

### `FxAction<Payload>`

```ts
interface FxAction<Payload> extends AnyAction {
  type: string
  payload: Payload
  // used internally by FxState
  fx: FxMeta
}
```

### `FxActionCreator<Payload>`

```ts
interface FxActionCreator<Payload> {
  (payload: Payload): FxAction<Payload>
  match: (action: AnyAction) => action is FxAction<Payload>
}
```

### `FxActionCreators<Item, Params>`

Given `myEffect`, which is a valid [`FxSource`](#fxsourceitem-params):

```ts
// given:
const actions = fxActionCreatorsFactory('STRING', myEffect)()

type FxActionCreators<Item, Params> = {
  // 'STRING'
  prefix: string

  // calls myEffect(params)
  subscribe: FxActionCreator<Params>

  // unsubscribes from the Observable or AsyncIterable returned by myEffect() (if applicable)
  // also, resets the FxState to 'initial' (all nulls)
  unsubscribe: EmptyFxActionCreator

  // completely removes the FxState instance from the store
  destroy: EmptyFxActionCreator

  // given the store's current state, returns the unique FxState managed by these actions
  selector: (state) => FxState<Item, Params>

  // the rest of these are called by FxState internally
  next: FxActionCreator<Item>
  error: FxActionCreator<any>
  complete: EmptyFxActionCreator
}
```

## `MyComponent.tsx`

Use an [`FxActionCreatorsFactory`](#myeffectactions-ts) to instantiate and use a set of [`FxActionCreators`](#fxactioncreatorsitem-params) in a component.

**Note:** This is abbreviated for clarity and simplicity. It is not to be taken as a real code example. Generics are omitted. No external libraries (e.g. `react-redux`) are used.

```ts
import * as React from 'react'

import store from './store'
import myEffectActionsFactory from './myEffectActions'

export default class MyComponent extends React.Component {
  actions: FxActionCreators

  constructor(props) {
    super(props)
    // create a set of Action Creators unique to this component instance
    this.actions = myEffectActionsFactory()
    store.subscribe(this.forceUpdate)
  }

  render() {
    // use the unique selector to get my unique state
    const fxState = this.actions.selector(store.getState())
    return (
      <div className={fxState.status}>
        {fxState.error || fxState.data}
      </div>
    )
  }

  componentDidMount {
    // `this.props.params` must be the same type that is accepted by the `myEffect` function above
    store.dispatch(this.actions.subscribe(this.props.params))
  }

  componentWillUnmount {
    store.dispatch(this.actions.destroy())
  }
}
```

## Special Cases

Work-in-progress.

### I want to accumulate the responses to a subscription in state.

`FxState` simply stores in `data` what is `next()`-ed or `yield`-ed by the `FxSource`.

Try using [`Observable.scan()`](http://reactivex.io/documentation/operators/scan.html) to accumulate the responses in an array or map. Alternately, repeatedly `yield` an array of responses created by `concat`-ing the previous array to each subsequent response.

### My subscription has no "initial response".

Most asynchronous subscriptions, such as long-polling or WebSocket connections, will respond immediately with the "current state". Subsequent responses contain updates. That initial response/handshake triggers a state change in `FxState`, shifting the `status` property from `subscribing` to `subscribed`. It is implemented this way so that a consumer may present some sort of "loading" indicator to a user while the connection is being established.

Some subscriptions do not respond with an initial handshake, or do not have a "current state". For example, "event" subscriptions - such as waiting for a user interaction, or a tweet matching a given filter - can be established successfully with no initial "item".

Try calling `Observable.next(null)` or `yield null` as soon as the subscription is opened. The `status` will shift to `subscribed`, but `data` will remain `null`.

### I want to do something else with the data that's coming over the wire.

Example: I want to normalize the data into an id-based collection in my Redux schema.

The `fxEpic`/`fxMiddleware` dispatches actions in response to the state of the asynchronous operation performed by the `FxSource`. Those actions are [`FxActions`](#fxactionpayload), which are regular Redux actions adhering to a Flux-style structure. Feel free to write your own custom reducers, epics, sagas, or other middleware that handle `FxActions`.

Every [`FxActionCreatorsFactory`](https://github.com/hiebj/fx-state/blob/master/src/FxState.ts#L163) returned by [`fxActionCreatorsFactory()`](#myeffectactions-ts) has a [`matchers` property](https://github.com/hiebj/fx-state/blob/master/src/FxState.ts#L154) containing methods that will return `true` if a given action appears to have been created by an `FxActionCreator` spawned from that factory (determined by matching the type string and checking `fx` metadata). You can use `FxActionCreatorsFactory.matchers['subscribe' | 'next' | 'unsubscribe' ...]` to identify and handle actions created by specific `FxActionCreators` in your own epics or reducers.

Alternately, you can do your own matching/filtering by looking at the [`FxMeta`](https://github.com/hiebj/fx-state/blob/master/src/FxState.ts#L109) on a given action yourself and determining which actions you would like to reduce or respond to, and in what way.

## How it works

![Diagram](https://github.com/hiebj/fx-state/blob/master/img/FxState.jpeg)
