import { airDensityMolM3 } from './concentrationUnits'

// Air number density is optional, so its entered values live in the evolving slice's generic
// additionalSeries map, alongside hidden series like PHOTO.*, aligned with evolving.times.
export const DENSITY_SERIES_KEY = 'ENV.air number density.mol m-3'

// Air density (mol m-3) for one set of conditions: a provided value wins, otherwise the ideal
// gas law.
export const resolveAirDensity = ({ density, pressure, temperature }) =>
  typeof density === 'number' && Number.isFinite(density) && density > 0
    ? density
    : airDensityMolM3(pressure, temperature)

// Air density at `time` under the conditions a ConditionsManager holds (see
// buildConditionsManager).
export function airDensityAtTime(conditionsManager, time) {
  const { temperature, pressure, airDensity } = conditionsManager.getConditionsAtTime(time)
  return resolveAirDensity({ density: airDensity, pressure, temperature })
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
