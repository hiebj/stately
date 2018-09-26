import * as React from 'react'

import { AsyncState } from 'stately-async';
import { Omit } from 'stately-async/subtraction'

import { AsyncProps, Async } from './Async';

export interface CallableAsyncProps<Data, Params extends any[]> extends Omit<AsyncProps<Data, Params>, 'children' | 'params'> {
  children: (state: AsyncState<Data, Params>, call: (...params: Params) => void) => React.ReactNode
}

interface CallableAsyncState<Params> {
  params?: Params
}

/**
 * Props: {@link CallableAsyncProps} extends Omit<{@link AsyncProps}, 'children' | 'params'>
 * 
 * A render-prop component that injects an `AsyncLifecycle` for any `AsyncOperation` into the component tree.
 * Identical to {@link Async}, except that instead of accepting `params` as a prop, it passes `call(...params: Params)` to its [children]{@link CallableAsyncProps}.
 * As such, `CallableAsync` gives the `children` control over when the operation is executed - typically as a result of a user interaction.
 * This can be used for user-initiated asynchronous calls, such as saving a form.
 * 
 * The following example invokes `save` when the button is clicked:
 * ```
 * // type save = (entity: Entity) => Promise
 * 
 * <CallableAsync operation={save}>
 *   {(state, call) =>
 *     <div>
 *       {
 *         // If the Promise is rejected, render the error.
 *         state.error ? <span className="error">{state.error}</span>
 *           // If the Promise resolves, render a success message.
 *           : state.status === 'complete' ? <span className="success">Entity saved successfully.</span>
 *           // If the operation is active, render a loading indicator.
 *           : state.status === 'active' && <span className="loading" />
 *       }
 *       <button
 *         onClick={() => save(entity)}>
 *         Save
 *       </button>
 *     </div>}
 * </CallableAsync>
 * ```
 * 
 * The implementation of `CallableAsync` is trivial. It is a stateful wrapper around `Async` that calls `setState(params)` when `call(params)` is invoked.
 * More complex use cases that are not met by `Async` or `CallableAsync` can be achieved using a similar strategy.
 */
export class CallableAsync<Data, Params extends any[]> extends React.Component<
  CallableAsyncProps<Data, Params>,
  CallableAsyncState<Params>
> {
  state: CallableAsyncState<Params> = {}

  call = (...params: Params) => {
    this.setState({ params })
  }

  render() {
    const { children, ...props } = this.props
    const { params } = this.state
    return (
      <Async {...props} params={params}>
        {state =>
          children(state, this.call)}
      </Async>
    )
  }
}
