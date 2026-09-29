import { airDensityMolM3, concentrationDivisor, isMixingRatioUnit } from './concentrationUnits'

// Air number density is optional, so its values live in the evolving slice's generic
// additionalSeries map, alongside hidden series like PHOTO.*, aligned with evolving.times.
export const DENSITY_SERIES_KEY = 'ENV.air number density.mol m-3'

// Air density (mol m-3) for one condition: a provided value wins, otherwise the ideal gas law.
export const resolveAirDensity = ({ density, pressure, temperature }) =>
  typeof density === 'number' && Number.isFinite(density)
    ? density
    : airDensityMolM3(pressure, temperature)

// Temperature (K), pressure (Pa) and provided air density (mol m-3, or null) at each result
// time, mirroring the solver's step interpolation: the most recent evolving value at or before
// the result's time wins, and the initial conditions apply before the first evolving point.
export function buildEnvironmentSeries(conditions, results) {
  if (!Array.isArray(results)) return []

  const times = conditions.evolving?.times
  const densitySeries = conditions.evolving?.additionalSeries?.[DENSITY_SERIES_KEY]
  const evolvingPoints = Array.isArray(times)
    ? times
        .map((time, index) => ({
          time,
          temperature: conditions.evolving.temperature?.[index],
          pressure: conditions.evolving.pressure?.[index],
          density: Array.isArray(densitySeries) ? densitySeries[index] : null,
        }))
        .filter((point) => typeof point.time === 'number' && Number.isFinite(point.time))
        .sort((a, b) => a.time - b.time)
    : []
  const hasEvolving = Boolean(conditions.evolving?.enabled) && evolvingPoints.length > 0

  return results.map((result) => {
    let temperature = conditions.initial.temperature
    let pressure = conditions.initial.pressure
    let density = null

    if (hasEvolving) {
      for (const point of evolvingPoints) {
        if (point.time > result.time) break
        // A null entry means "not set at this point" (e.g. a row that only carried rate
        // parameters), not "set to nothing" -- it should leave the carried-forward value
        // alone rather than blanking it out.
        if (point.temperature != null) temperature = point.temperature
        if (point.pressure != null) pressure = point.pressure
        if (point.density != null) density = point.density
      }
    }

    return { time: result.time, temperature, pressure, density }
  })
}

export const airDensitySeries = (environmentSeries) => environmentSeries.map(resolveAirDensity)

// One divisor per result sample, for converting the increase over the interval that STARTS at
// that sample (conditions are step-held, so the interval uses its starting conditions).
// Null when the unit needs no air density.
export function buildIntervalDivisors(unitId, environmentSeries) {
  if (!isMixingRatioUnit(unitId)) return null
  return airDensitySeries(environmentSeries).map((density) =>
    concentrationDivisor(unitId, density)
  )
}
