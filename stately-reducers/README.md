# stately-reducers
[[api]](https://hiebj.github.io/stately/modules/stately_reducers.html) [[github]](https://github.com/hiebj/stately/tree/master/stately-reducers)  
[![npm](https://img.shields.io/npm/v/stately-reducers.svg?style=flat-square)](https://www.npmjs.com/package/stately-reducers)

This module contains functional composers for Redux reducers. Used together, they allow a complex state model to be expressed by composing simple, atomic reducers.

## Definitions

- **Atomic reducer**: The simplest possible reducer. Handles a single action and performs a single state mutation.
- **Model reducer**: A reducer composed from one or more related **Atomic** reducers using `chain`. The composed reducer comprises all actions and state mutations related to a given state shape, or **Model**.
- **Slice reducer**: A reducer created by `box`. The reducer's state is maintained under a single property or "namespace" of a root object, forming a **slice** of the state tree.
- **Root reducer**: A reducer composed from many **Slice** reducers using `merge`, whose shape is the intersection of the given reducer shapes. This is the final reducer that will be passed to `createStore`, and thus forms the **root** of the state tree.

Atomic reducers are succinct, readable, testable, and do not require branching logic such as `switch` statements or nested ternary expressions. By defining all of your state management using atomic reducers, then composing them into more complex state trees, many logic bugs and organizational problems can be prevented. Atomic reducers can also be reused by more than one model, keeping code DRY.

`chain` and `box` are typically used together in a single file to define a Model reducer and its containing Slice reducer. These are then composed using `merge` in the store definition. The advantage to this strategy over `combineReducers` is that the shape of a reducer is defined *where the reducer is defined*, rather than *where the store is defined*. Instead of having to go to the store definition to understand where the data from a reducer will live in the state tree, it is evident in the definition of the reducer itself.

## Usage

The composers in this module are `chain`, `box`, and `merge`. They are typically used in that order, following a composition strategy that progresses from the specific (atomic) to the general (composed).

TypeScript itself does not have sufficient syntax sugar to express the types succinctly. However, using some pseudo-type syntax, the composers look something like:
```
// many atomic reducers with the same state shape become a model reducer
type chain = <S>(...reducers: Reducer<S>[]) => Reducer<S>

// Reducer<S> becomes Reducer<{ key: S }>, forming a slice reducer
type box = <K, S>(key: K, reducer: Reducer<S>) => Reducer<{ [K]: S }>

// many independent reducers with different shapes become a root reducer
type merge = <...S>(...reducers: Reducer<...S>[]) => Reducer<Intersection<...S>>
```

The following pseudo-example takes three sets of atomic reducers A, B, and C, composing them into models, slices, and finally a root reducer in a single expression:
```
const aReducers: Reducer<A>[]
const bReducers: Reducer<B>[]
const cReducers: Reducer<C>[]

const rootReducer = merge(
  box('a', chain(...aReducers)),
  box('b', chain(...bReducers)),
  box('c', chain(...cReducers)),
)

// typeof rootReducer: Reducer<{ a: A, b: B, c: C }>
```

For a working example of `chain`, `box`, and `merge` used together, see [`merge.spec.ts`](/stately-reducers/src/merge.spec.ts).
