import * as React from 'react'
import { Effect, fxActions } from 'fx-state'
import { FxActionCreators, FxActionsConfig } from 'fx-state/actions'
import { get as fxCacheGet } from 'fx-state/cache'

export interface FxActionsProps<Data, Params extends any[]> {
  fxActions: FxActionCreators<Data, Params>
}

/**
 * withFxActions is a React high-order component factory that injects a unique `fxActions` prop into the given component.
 * The given `fxActions` is a unique `FxActionCreators` instance representing the side-effect passed to the factory.
 * The consumer has complete control over when the actions are dispatched, so is responsible for calling the effect, rendering the FxState, and cleaning up with `destroy()`.
 * This makes it possible to access the `fxActions` in the `ownProps` parameter passed to `mapStateToProps` and `mapDispatchToProps`.
 *
 * The following example defines a connected component with the `fxActions` prop injected.
 * The `mapStateToProps` function uses the given `fxActions` to access a unique FxState for the component.
 * The `mapDispatchToProps` function wraps the `call` and `destroy` action creators with `dispatch` and passes them down to the underlying component.
 *
 * @example
 * ```
 * // typeof Component: React.ComponentType<{ state: FxState, call: (...params) => void, destroy: () => void }>
 *
 * const mapStateToProps = (state, { fxActions }) => ({
 *   state: fxActions.selector(state)
 * })
 * const mapDispatchToProps = (dispatch, { fxActions }) => ({
 *   call: (...params) => dispatch(fxActions.call(...params)),
 *   destroy: () => dispatch(fxActions.destroy())
 * })
 *
 * const Connected = connect(mapStateToProps, mapDispatchToProps)(Component)
 *
 * // typeof effect: (p1: number, p2: string) => Promise<string>
 * const WithFxActions = withFxActions(effect)(Connected)
 * ```
 */
export const withFxActions = <Data, Params extends any[]>(
  effectOrConfig: Effect<Data, Params> | FxActionsConfig<Data, Params>,
) =>
  function<Props extends FxActionsProps<Data, Params>>(
    Component: React.ComponentType<Props>,
  ): React.ComponentType<Subtract<Props, FxActionsProps<Data, Params>>> {
    const displayName = `withFxActions(${Component.name})`
    class WithFxActions extends React.Component<Subtract<Props, FxActionsProps<Data, Params>>> {
      fxActions: FxActionCreators<Data, Params>

      constructor(props: Subtract<Props, FxActionsProps<Data, Params>>) {
        super(props)
        this.fxActions = fxActions(effectOrConfig)
      }

      render() {
        return <Component {...this.props} fxActions={this.fxActions} />
      }

      componentWillUnmount() {
        if (fxCacheGet(this.fxActions.id)) {
          // tslint:disable-next-line:no-console
          console.warn(
            `${displayName}:\n`,
            'This component is unmounting, but the associated `fxActions` was not destroyed.',
            'It is the responsibility of a component using `withFxActions` to clean up after itself,',
            'as `withFxActions` does not have access to `dispatch`.\n',
            'Failing to destroy `fxActions` may cause a memory leak.',
          )
        }
      }
    }
    ;(WithFxActions as React.ComponentClass<
      Subtract<Props, FxActionsProps<Data, Params>>
    >).displayName = displayName
    return WithFxActions
  }
