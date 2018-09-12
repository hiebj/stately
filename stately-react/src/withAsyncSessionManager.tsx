import * as React from 'react'

import { AsyncFunction, createAsyncSession, AsyncSessionManager } from 'stately-async'
import { get as fxCacheGet } from 'stately-async/cache'

import { Subtract } from './types'

export interface WithAsyncSessionManagerProps<Data, Params extends any[]> {
  asyncFunction: AsyncFunction<Data, Params>
}

export interface AsyncSessionManagerProps<Data, Params extends any[]> {
  asyncSessionManager: AsyncSessionManager<Data, Params>
}

/**
 * withAsyncSessionManager is a React high-order component factory that injects an `asyncSessionManager` prop into the given component.
 * The given `asyncSessionManager` is a unique `AsyncSessionManager` instance representing the `asyncFunction` passed to the component.
 * The consumer has complete control over how the session manager is used, so is responsible for dispatching the `call` action, rendering the `AsyncSession`, and cleaning up by dispatching the `destroy` action.
 * 
 * The primary benefit of this HOC is that it creates the `AsyncSessionManager` for you and injects it, making it accessible in `mapStateToProps` and `mapDispatchToProps`.
 *
 * The following example demonstrates using `mapStateToProps` and `mapDispatchToProps` to inject session state and action dispatchers into a component:
 * ```
 * // typeof Component: React.ComponentType<{
 * //   session: AsyncSession
 * //   call: (...params) => void
 * //   destroy: () => void
 * // }>
 *
 * const mapStateToProps = (state, { asyncSessionManager }) => ({
 *   session: asyncSessionManager.selector(state)
 * })
 * const mapDispatchToProps = (dispatch, { asyncSessionManager }) => ({
 *   call: (...params) => dispatch(asyncSessionManager.call(...params)),
 *   destroy: () => dispatch(asyncSessionManager.destroy())
 * })
 *
 * const Connected = connect(mapStateToProps, mapDispatchToProps)(Component)
 * const WithSessionComponent = withAsyncSessionManager(Connected)
 * 
 * // typeof asyncFn: (p1: number, p2: string) => Promise<string>
 * // to use: <WithSessionComponent asyncFunction={asyncFn} />
 * ```
 */
function withAsyncSessionManager<Data, Params extends any[], Props extends AsyncSessionManagerProps<Data, Params>>(
  Component: React.ComponentType<Props>,
): React.ComponentType<
  Subtract<Props, AsyncSessionManagerProps<Data, Params>> & WithAsyncSessionManagerProps<Data, Params>
> {
  const displayName = `withAsyncSessionManager(${Component.name})`
  class WithAsyncSessionManager extends React.Component<
    Subtract<Props, AsyncSessionManagerProps<Data, Params>> & WithAsyncSessionManagerProps<Data, Params>
  > {
    manager: AsyncSessionManager<Data, Params>

    constructor(
      props: Subtract<Props, AsyncSessionManagerProps<Data, Params>> & WithAsyncSessionManagerProps<Data, Params>,
    ) {
      super(props)
      this.manager = createAsyncSession(props.asyncFunction)
    }

    render() {
      return <Component {...this.props} asyncSessionManager={this.manager} />
    }

    componentWillUnmount() {
      if (fxCacheGet(this.manager.sid)) {
        // tslint:disable-next-line:no-console
        console.warn(
          `${displayName}:\n`,
          'This component is unmounting, but the associated `AsyncSession` was not destroyed.',
          'It is the responsibility of a component using `withAsyncSessionManager` to clean up after itself,',
          'as the HOC does not have access to `dispatch`.\n',
          'Failing to destroy the `AsyncSession` will cause a memory leak.',
        )
      }
    }
  }
  ;(WithAsyncSessionManager as React.ComponentClass<
    Subtract<Props, AsyncSessionManagerProps<Data, Params>> & WithAsyncSessionManagerProps<Data, Params>
  >).displayName = displayName
  return WithAsyncSessionManager
}

export { withAsyncSessionManager }
