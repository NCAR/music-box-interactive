import { airDensityMolM3, concentrationDivisor, isMixingRatioUnit } from './concentrationUnits'

// Air number density is optional, so its entered values live in the evolving slice's generic
// additionalSeries map, alongside hidden series like PHOTO.*, aligned with evolving.times.
export const DENSITY_SERIES_KEY = 'ENV.air number density.mol m-3'

// Air density (mol m-3) for one condition: a provided value wins, otherwise the ideal gas law.
// Solver output always carries a density; the fallback serves the Conditions tables, which
// have only the entered temperature and pressure.
export const resolveAirDensity = ({ density, pressure, temperature }) =>
  typeof density === 'number' && Number.isFinite(density)
    ? density
    : airDensityMolM3(pressure, temperature)

// Temperature (K), pressure (Pa) and air number density (mol m-3) at each result time, as
// reported by the solver -- it already applies evolving conditions and any provided density.
export function buildEnvironmentSeries(results) {
  if (!Array.isArray(results)) return []

  return results.map((result) => ({
    time: result.time,
    temperature: result.environment?.temperature ?? null,
    pressure: result.environment?.pressure ?? null,
    density: result.environment?.airDensity ?? null,
  }))
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
