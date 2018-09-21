# stately-reducers

This library contains functional composers for Redux reducers. Used together, they allow single-action atomic reducers to be composed into a state tree with any degree of nesting and complexity.

The composers in this library are `chain`, `box`, and `merge`. They are typically used in that order, following a composition strategy that progresses from the most specific (each reducer handles a single action) to the most general (the composed reducer that manages the entire state tree).

`chain` and `box` are typically used together in a single file to define a "slice reducer". These are then composed using `merge` in the store definition. The advantage to this strategy over `combineReducers` is that the shape of a reducer is defined *where the reducer is defined*, rather than *where the store is defined*. Instead of having to go to the store definition to understand where the data from a reducer will live in the state tree, it is evident in the definition of the reducer itself.

## Usage

TypeScript itself does not have sufficient syntax sugar to express the types succinctly. However, using some pseudo-type syntax, the composers look something like:
```
type chain = <S>(...reducers: Reducer<S>[]) => Reducer<S>
type box = <S, K>(reducer: Reducer<S>, key: K) => Reducer<{ [K]: S }>
type merge = <...S>(...reducers: [Reducer<...S>]) => Reducer<Union<...S>>
```

A pseudo-example using all three composers together would look like:
```
const aReducers: Reducer<A>[]
const bReducers: Reducer<B>[]
const cReducers: Reducer<C>[]

const allReducers = merge(
  box(chain(...aReducers), 'a'),
  box(chain(...bReducers), 'b'),
  box(chain(...cReducers), 'c')
)

// typeof allReducers: Reducer<{ a: A, b: B, c: C }>
```

For a working example of `chain`, `box`, and `merge` used together, see [`merge.spec.ts`](/stately-reducers/src/merge.spec.ts).
