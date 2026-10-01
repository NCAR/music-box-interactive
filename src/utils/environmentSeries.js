import { airDensityMolM3 } from './concentrationUnits'

// Air density (mol m-3) at `time` under the conditions a ConditionsManager holds (see
// buildConditionsManager): a provided density wins, otherwise the ideal gas law -- the solver's
// own rule. A non-positive density is not a usable air density, so it counts as not provided.
export function airDensityAtTime(conditionsManager, time) {
  const { temperature, pressure, airDensity } = conditionsManager.getConditionsAtTime(time)
  return typeof airDensity === 'number' && Number.isFinite(airDensity) && airDensity > 0
    ? airDensity
    : airDensityMolM3(pressure, temperature)
}

// Temperature (K) and pressure (Pa) at each result time, as reported by the solver.
export function buildEnvironmentSeries(results) {
  if (!Array.isArray(results)) return []

  return results.map((result) => ({
    time: result.time,
    temperature: result.environment?.temperature ?? null,
    pressure: result.environment?.pressure ?? null,
  }))
}

// Air density (mol m-3) at each result time, as reported by the solver. Null when any point
// lacks one.
export function airDensitiesFromResults(results) {
  if (!Array.isArray(results) || results.length === 0) return null

  const densities = results.map((result) => result.environment?.airDensity)
  return densities.every((d) => typeof d === 'number' && Number.isFinite(d) && d > 0)
    ? densities
    : null
}
