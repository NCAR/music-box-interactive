export const GAS_CONSTANT = 8.31446261815324 // J / (mol K)

// mol m-3 is the storage unit everywhere. Mixing-ratio units scale the air number density
// (mol m-3), so converting to or from them needs the temperature and pressure of the air.
export const MIXING_RATIO_FACTORS = {
  mol_mol: 1,
  ppth: 1e-3,
  ppm: 1e-6,
  ppb: 1e-9,
  ppt: 1e-12,
}

export const CONCENTRATION_UNITS = [
  { id: 'mol_m3', label: 'mol m-3' },
  { id: 'mol_mol', label: 'mol mol-1' },
  { id: 'ppth', label: 'ppth' },
  { id: 'ppm', label: 'ppm' },
  { id: 'ppb', label: 'ppb' },
  { id: 'ppt', label: 'ppt' },
]

export function airDensityMolM3(pressurePa, temperatureK) {
  return pressurePa / (GAS_CONSTANT * temperatureK)
}

export function isMixingRatioUnit(unitId) {
  return unitId in MIXING_RATIO_FACTORS
}

// Divisor turning a mol m-3 value into the given unit; feeds inputs that convert by division.
export function concentrationDivisor(unitId, airDensity) {
  return isMixingRatioUnit(unitId) ? MIXING_RATIO_FACTORS[unitId] * airDensity : 1
}

export function toMolM3(value, unitId, airDensity) {
  return isMixingRatioUnit(unitId) ? value * MIXING_RATIO_FACTORS[unitId] * airDensity : value
}

export function fromMolM3(valueMolM3, unitId, airDensity) {
  return isMixingRatioUnit(unitId)
    ? valueMolM3 / (MIXING_RATIO_FACTORS[unitId] * airDensity)
    : valueMolM3
}

// Array forms: `airDensities` holds one air number density (mol m-3) per value, so the caller
// decides where the densities come from (solver output, entered conditions, ...).
export function fromMolM3Array(values, unitId, airDensities) {
  return values.map((value, i) => fromMolM3(value, unitId, airDensities[i]))
}

// One divisor per sample, for converting the increase over the interval that STARTS at that
// sample (conditions are step-held, so an interval uses its starting conditions). Null when
// the unit needs no air density.
export function buildIntervalDivisors(unitId, airDensities) {
  if (!isMixingRatioUnit(unitId) || !airDensities) return null
  return airDensities.map((density) => concentrationDivisor(unitId, density))
}
