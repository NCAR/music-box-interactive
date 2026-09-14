// Pressure is a pure ratio from Pa, so it reuses the divisor/formatBound machinery
// from timeRangeUnits.js the same way TimeTab's fields do.
export const PRESSURE_UNITS = [
  { id: 'Pa', label: 'Pa', divisor: 1 },
  { id: 'atm', label: 'atm', divisor: 101325 },
]
