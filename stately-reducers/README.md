# stately-reducers

This library contains functional composers for Redux reducers, together providing a clean pattern for managing complex state trees.

The composers in this library are `chain`, `box`, and `merge`. They are typically used in that order, following a composition strategy that progresses from the most specific (reducers handling a single action) to the most general (the composed reducer that manages the entire state tree).

## Pseudo-example

TypeScript itself does not have sufficient syntax sugar to express the types succinctly. However, using some pseudo-type syntax, it can be described as:
```
type chain = <S>(...reducers: Reducer<S>[]) => Reducer<S>
type box = <S>(boxes: { [key: string]: Reducer<S> }) => Reducer<{ [key]: Reducer<S> }>
type merge = <...S>(...reducers: [Reducer<...S>]) => Reducer<Union<...S>>
```

A pseudo-example using all three composers would look like:
```
const aReducers: Reducer<A>[]
const bReducers: Reducer<B>[]
const cReducers: Reducer<C>[]

const allReducers = merge(
  box({ a: chain(...aReducers) }),
  box({ b: chain(...bReducers) }),
  box({ c: chain(...cReducers) })
)

// typeof allReducers: Reducer<{ a: A, b: B, c: C }>
```

## Expanded Example
You would not use these functions all in a single expression, as shown above in the pseudo-example. The purpose of this library is to allow definition of atomic, single-action reducers across multiple files. Consider the following abbreviated example, which merges reducers across two different domains - `OpenClosed` and `User` - into the final store shape:

**OpenClosed.ts**
```
import { chain, box } from 'stately-reducers'

type IsOpen = { open: boolean }
const openReducer: Reducer<IsOpen> = ...
const closeReducer: Reducer<IsOpen> = ...
const isOpenReducer: chain(openReducer, closeReducer)
export const isOpenSliceReducer: box({ isOpen: isOpenReducer })
```

**User.ts**
```
import { chain, box } from 'stately-reducers'

type User = { id: number; name: string }
const changeIdReducer: Reducer<User> = ...
const changeNameReducer: Reducer<User> = ...
const userReducer: chain(changeIdReducer, changeNameReducer)
export const userSliceReducer = box({ user: userReducer })
```

**store.ts**
```
import { createStore } from 'redux'
import { merge } from 'stately-reducers'

import { isOpenSliceReducer } from './OpenClosed'
import { userSliceReducer } from './Users'

export const store = createStore(merge(isOpenSliceReducer, userSliceReducer))
```

The resulting type of `store`, containing the composed shape of all of the reducers, is:
```
Store<{
  isOpen: { open: boolean },
  user: { id: number, name: string }
}>
```
