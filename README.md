# stately

**[stately-react](/stately-react)**  
Components and related types for simplifying management and integration of state in React apps. The primary exports (currently) are `<DeclarativeEffect>` and `<CallableEffect>`. These are render-prop components that allow painless integration of arbitrary side-effects into any React component.

**[stately-fx](/stately-fx)**  
Functions and related types for managing the state of side-effects, following the Reducer pattern and the Observable spec. Exports include the functions `fxActions`, `fxReducer`, and `fxMiddleware`, along with their related types. Together they allow a consumer to independently track the state of individual calls to a side-effect.

Published as a separate module to avoid dependency on React.
