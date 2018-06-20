# fx-state
Types, actions, reducer, and middleware for managing the state of side-effects in Redux.

## Usage

### `store.ts`: Integrate the reducer and middlware into your store
**Use `fxMiddleware` if you're not using `redux-observable`:**
```
import { createStore, applyMiddleware } from 'redux'
import { fxReducer, reduceReducers, fxMiddleware } from 'fx-state'

import myReducer from './myReducer'

const reducer = reduceReducers(myReducer, fxReducer)
const store = createStore(reducer, {}, applyMiddleware(fxMiddleware))
```

**Use `fxEpic` if you _are_ using `redux-observable`:**
```
import { createStore, applyMiddleware } from 'redux'
import { combineEpics, createEpicMiddleware } from 'redux-observable'
import { fxReducer, reduceReducers, fxEpic } from 'fx-state'

import myReducer from './myReducer'
import myEpic from './myEpic'

const reducer = reduceReducers(myReducer, fxReducer)
const epics = combineEpics(myEpic, fxEpic)
const store = createStore(myReducer, {}, applyMiddleware(createEpicMiddleware(fxEpic)))
```

### `myEffectActions.ts`: Create a set of action creators for a given side effect
Given `myEffect`, which is a valid [`FxSource`](#fxsourceitem-params):

```ts
import myEffect from './myEffect'
import { fsActionCreatorsFactory } from 'fx-state'

export default const myEffectActionsFactory = fxActionCreatorsFactory('MY_EFFECT', myEffect)
```

### `MyComponent.tsx`: Instantiate and use the action creators in a component
**Note:** This is abbreviated for clarity and simplicity. It is not to be taken as a real code example. Generics are omitted.

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
    const fxState = this.actions.selector(store.getState())
    return (
      <div className={fxState.status}>
        {fxState.error || fxState.data}
      </div>
    )
  }

  componentDidMount {
    // assumes `params` is the same type that is accepted by the `myEffect` function above
    store.dispatch(this.actions.subscribe(this.props.params))
  }

  componentWillUnmount {
    store.dispatch(this.actions.destroy())
  }
}
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
type FxActionCreator<Payload> = (payload: Payload) => FxAction<Payload>
```

### `FxActionCreators<Item, Params>`
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
