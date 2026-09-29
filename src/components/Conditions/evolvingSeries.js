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

// Removes selected rows from all evolving series in sync and returns the updated data and
// removed time values. buildSolverConditions falls back to initial.temperature/pressure/concentrations
// for t=0 whenever the evolving series doesn't cover it, so removing that row just means
// nothing overrides the default.
export function removeEvolvingTimeRows({ times, temperature, pressure, additionalSeries }, selectedIndices) {
  const indicesToRemove = new Set(selectedIndices)
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

// Changes one row's time value and keeps every parallel array (temperature, pressure, each
// additionalSeries key) aligned by re-sorting them all together, so a row's data travels with
// it to its new position instead of getting scrambled relative to the other rows. Returns null
// if newTime is a no-op (unchanged) or collides with another existing row.
export function renameEvolvingTime({ times, temperature, pressure, additionalSeries }, index, newTime) {
  if (times[index] === newTime) return null
  if (times.some((t, i) => i !== index && t === newTime)) return null

  const additionalKeys = Object.keys(additionalSeries || {})
  const rows = times
    .map((time, i) => ({
      time: i === index ? newTime : time,
      temperature: temperature[i],
      pressure: pressure[i],
      additional: Object.fromEntries(additionalKeys.map((key) => [key, additionalSeries[key]?.[i] ?? null])),
    }))
    .sort((a, b) => a.time - b.time)

  return {
    oldTime: times[index],
    newTime,
    times: rows.map((row) => row.time),
    temperature: rows.map((row) => row.temperature),
    pressure: rows.map((row) => row.pressure),
    additionalSeries: Object.fromEntries(
      additionalKeys.map((key) => [key, rows.map((row) => row.additional[key])])
    ),
  }
}

// Shared parse/validate/rename pipeline behind every time-cell edit in EnvironmentTab,
// ReactionTab, and SpeciesConcentrationTab -- those three call sites were byte-for-byte the
// same logic wrapped around their own draft-state and toast wording, so only that surrounding
// part stays per-component. Returns a tagged result the caller switches on:
//   { kind: 'invalid' }             -- not a valid non-negative number
//   { kind: 'unchanged' }           -- same as the current value, nothing to do
//   { kind: 'duplicate', newTime }  -- collides with another row's time
//   { kind: 'ok', result }          -- result is renameEvolvingTime's return value
export function commitEvolvingTime({ times, temperature, pressure, additionalSeries }, index, rawValue) {
  const trimmed = rawValue.trim()
  const newTime = parseFloat(trimmed)

  if (trimmed === '' || isNaN(newTime) || newTime < 0) {
    return { kind: 'invalid' }
  }
  if (newTime === times[index]) {
    return { kind: 'unchanged' }
  }
  if (times.some((t, i) => i !== index && t === newTime)) {
    return { kind: 'duplicate', newTime }
  }

  const result = renameEvolvingTime({ times, temperature, pressure, additionalSeries }, index, newTime)
  if (!result) return { kind: 'unchanged' }
  return { kind: 'ok', result }
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
