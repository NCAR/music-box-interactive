// Stable fallback for selectors. Avoids new array references that
// can trigger useSyncExternalStore render loops.
export const EMPTY_ARRAY = []
