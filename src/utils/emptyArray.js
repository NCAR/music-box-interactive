// A stable reference for selector fallbacks. `state.foo?.bar || []` creates a new array on every
// call, which breaks useSyncExternalStore's snapshot-stability check and can trigger infinite
// render loops in components that key an effect off the selected value.
export const EMPTY_ARRAY = []
