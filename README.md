# stately

**[stately-fx](/stately-fx)**  
Types and functions for managing the state of side-effects, following the Reducer pattern and the Observable spec. Exports include the functions `fxActions`, `fxReducer`, and `fxMiddleware`, along with their related types. Together they allow a consumer to independently track the state of individual calls to a side-effect.

Published as a separate module to avoid dependency on React.

**[stately-react](/stately-react)**  
Types and components for simplifying management and integration of state in React apps. Exports include `<DeclarativeEffect>` and `<CallableEffect>`, which are render-prop components that allow streamlined integration of arbitrary side-effects into any React component.
