// Shared row operations for EnvironmentTab and ReactionTab; keeps all evolving condition arrays in sync.
// Defines defaults for blank fields and new ReactionTab time points to keep arrays aligned.
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

// Removes selected rows from all evolving series in sync, excluding t=0,
// and returns the updated data and removed time values.
export function removeEvolvingTimeRows({ times, temperature, pressure, additionalSeries }, selectedIndices) {
  const indicesToRemove = new Set([...selectedIndices].filter((i) => times[i] !== 0))
  if (indicesToRemove.size === 0) return null

  return {
    removedCount: indicesToRemove.size,
    removedTimes: times.filter((_, i) => indicesToRemove.has(i)),
    times: times.filter((_, i) => !indicesToRemove.has(i)),
    temperature: temperature.filter((_, i) => !indicesToRemove.has(i)),
    pressure: pressure.filter((_, i) => !indicesToRemove.has(i)),
    additionalSeries: removeAdditionalSeriesValues(additionalSeries, indicesToRemove),
  }
}

// Ensures a t=0 row exists; no-op if it already exists. Defaults to DEFAULT_TEMPERATURE/
// DEFAULT_PRESSURE unless the caller passes the real starting values.
export function ensureZeroTimeRow(
  { times, temperature, pressure, additionalSeries },
  newTime,
  { temperature0 = DEFAULT_TEMPERATURE, pressure0 = DEFAULT_PRESSURE } = {}
) {
  if (newTime === 0) {
    return { times, temperature, pressure, additionalSeries }
  }

  const zeroIndex = times.indexOf(0)
  if (zeroIndex !== -1) {
    // A t=0 row can already exist without temperature/pressure
    const nextTemperature = [...temperature]
    const nextPressure = [...pressure]
    if (nextTemperature[zeroIndex] == null) nextTemperature[zeroIndex] = temperature0
    if (nextPressure[zeroIndex] == null) nextPressure[zeroIndex] = pressure0
    return { times, temperature: nextTemperature, pressure: nextPressure, additionalSeries }
  }

  return {
    times: [0, ...times],
    temperature: [temperature0, ...temperature],
    pressure: [pressure0, ...pressure],
    additionalSeries: insertAdditionalSeriesValue(additionalSeries, 0),
  }
}
