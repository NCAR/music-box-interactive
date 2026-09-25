// Shared by EnvironmentTab and ReactionTab: both insert/remove rows in the evolving conditions
// slice (times/temperature/pressure/additionalSeries), which must all stay parallel arrays.

// Matches each field's placeholder when left blank, and what a new time point added from
// ReactionTab is given for temperature/pressure so those arrays stay parallel to evolving.times,
// even though that tab doesn't show them.
export const DEFAULT_TEMPERATURE = 298.15
export const DEFAULT_PRESSURE = 101325

export function insertAdditionalSeriesValue(series, insertIndex, value = null) {
  return Object.fromEntries(
    Object.entries(series || {}).map(([name, values]) => {
      const nextValues = Array.isArray(values) ? [...values] : []
      nextValues.splice(insertIndex, 0, value)
      return [name, nextValues]
    })
  )
}

export function removeAdditionalSeriesValues(series, removeIndices) {
  return Object.fromEntries(
    Object.entries(series || {}).map(([name, values]) => [
      name,
      (Array.isArray(values) ? values : []).filter((_, index) => !removeIndices.has(index)),
    ])
  )
}

// Ensures a t=0 row exists, using the same defaults a manually-added row gets (temperature/
// pressure defaulted, every additional-series column left not-set/null) -- callers use this
// right before adding the mechanism's first evolving time point, so t=0 is always present as
// the starting point. A no-op if t=0 already exists, or if the row being added already is t=0.
export function ensureZeroTimeRow({ times, temperature, pressure, additionalSeries }, newTime) {
  if (newTime === 0 || times.includes(0)) {
    return { times, temperature, pressure, additionalSeries }
  }

  return {
    times: [0, ...times],
    temperature: [DEFAULT_TEMPERATURE, ...temperature],
    pressure: [DEFAULT_PRESSURE, ...pressure],
    additionalSeries: insertAdditionalSeriesValue(additionalSeries, 0),
  }
}
