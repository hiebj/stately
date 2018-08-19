import * as React from 'react'
import { Effect, fxActions } from 'fx-state'
import { FxActionCreators, FxActionsConfig } from 'fx-state/actions'
import { get as fxCacheGet } from 'fx-state/cache'

export interface FxActionsProps<Data, Params extends any[]> {
  fxActions: FxActionCreators<Data, Params>
}
export const withFxActions = <OwnProps, Data, Params extends any[]>(
  // tslint:disable-next-line:variable-name
  Component: React.ComponentType<OwnProps & FxActionsProps<Data, Params>>,
  effectOrConfig: Effect<Data, Params> | FxActionsConfig<Data, Params>,
): React.ComponentType<OwnProps> => {
  const displayName = `withFxActions(${Component.name})`
  class WithFxActions extends React.Component<OwnProps> {
    fxActions: FxActionCreators<Data, Params>

    constructor(props: OwnProps) {
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
          'Failing to destroy `fxActions` will result in a slow memory leak.',
        )
      }
    }
  }
  ;(WithFxActions as any).displayName = displayName
  return WithFxActions
}
