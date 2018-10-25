/** @module stately-react */
import * as React from 'react'

import {
  AsyncOperation,
  AsyncState,
  asyncLifecycle,
  AsyncLifecycle,
  statelyAsyncReducer,
  statelyAsyncMiddleware,
} from 'stately-async'

import { createControllableContext } from './Controllable'

export interface AsyncProps<Data, Params extends any[]> {
  operation: AsyncOperation<Data, Params>
  params?: Params
  children: (state: AsyncState<Data, Params>) => React.ReactNode
}

const { Controller: AsyncController, Controllable: AsyncControllable } = createControllableContext(
  statelyAsyncReducer,
  statelyAsyncMiddleware,
)

export { AsyncController }

/**
 * Props: {@link AsyncProps}
 *
 * Context Providers: [Controller]{@link createControllableContext}<{@link AsyncState}>
 *
 * A render-prop component that injects an {@link AsyncLifecycle} for any {@link AsyncOperation} into the component tree.
 * It executes the given `AsyncOperation` on mount, and again whenever the given `params` change.
 * The {@link AsyncState} representing the operation is passed to this component's `children` as the sole parameter.
 * It should be used whenever a component needs asynchronously-loaded data to render, such as search results or an entity from a REST service.
 *
 * Each instance of `Async` will own a unique `AsyncLifecycle`.
 * This way, multiple instances using the same `AsyncOperation` will not conflict.
 * The component cleans up after itself by destroying the `AsyncLifecycle` on unmount.
 *
 * The following example wraps a `<SearchResults>` component, handling the execution and state management of the asynchronous search call:
 * ```
 * // type doSearch = (p1: number, p2: string) => Promise<SearchResults>
 *
 * <Async operation={doSearch} params={[123, 'abc']}>
 *   {state =>
 *     <div>
 *       {
 *         // If the Promise is rejected, render the error.
 *         state.error ? <ErrorMessage error={state.error} />
 *           // If the Promise resolves, render the SearchResults.
 *           : state.data ? <SearchResults results={state.data} />
 *           // If the operation is active, render a loading indicator.
 *           : state.status === 'active' && <LoadingSpinner />
 *       }
 *     </div>}
 * </Async>
 * ```
 */
export class Async<Data, Params extends any[]> extends React.Component<AsyncProps<Data, Params>> {
  asyncLifecycle: AsyncLifecycle<Data, Params>

  constructor(props: AsyncProps<Data, Params>) {
    super(props)
    this.asyncLifecycle = asyncLifecycle(props.operation)
  }

  render() {
    const { selector, call, destroy } = this.asyncLifecycle
    const { params } = this.props
    return (
      <AsyncControllable>
        {(state, dispatch) => (
          <LifecycleAsync
            params={params}
            state={selector(state)}
            call={(...params: Params) => {
              dispatch(call(...params))
            }}
            destroy={() => {
              dispatch(destroy())
            }}
          >
            {this.props.children}
          </LifecycleAsync>
        )}
      </AsyncControllable>
    )
  }
}

interface LifecycleAsyncProps<Data, Params extends any[]> {
  params?: Params
  state: AsyncState<Data, Params>
  call: (...params: Params) => void
  destroy: () => void
  children: AsyncProps<Data, Params>['children']
}

const paramsChanged = (prev?: any[], next?: any[]) =>
  prev !== next &&
  (!prev ||
    !next ||
    prev.length !== next.length ||
    !prev.every((value, index) => value === next[index]))

class LifecycleAsync<Data, Params extends any[]> extends React.Component<
  LifecycleAsyncProps<Data, Params>
> {
  params?: Params

  render() {
    const { children, state } = this.props
    return children(state)
  }

  componentDidMount() {
    this.maybeCall()
  }

  componentDidUpdate() {
    this.maybeCall()
  }

  maybeCall() {
    // people are likely to pass params as an array literal, which is always a new reference
    if (paramsChanged(this.params, this.props.params)) {
      this.params = this.props.params
      if (this.params) {
        this.props.call(...this.params)
      }
    }
  }

  componentWillUnmount() {
    this.props.destroy()
  }
}
