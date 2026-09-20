// Shared by any field that lets a concentration be entered as mol m-3 or ppb: Conditions >
// Species and the mechanism's "Constant concentration" species property. ppb is a mixing
// ratio, so converting it to mol m-3 needs the local air density, which the ideal gas law
// gives from temperature and pressure.
export const GAS_CONSTANT = 8.31446261815324 // J / (mol K)

export const CONCENTRATION_UNITS = [
  { id: 'mol_m3', label: 'mol m-3' },
  { id: 'ppb', label: 'ppb' },
]

export function airDensityMolM3(pressurePa, temperatureK) {
  return pressurePa / (GAS_CONSTANT * temperatureK)
}

export function toMolM3(value, unitId, airDensity) {
  return unitId === 'ppb' ? value * 1e-9 * airDensity : value
}

export function fromMolM3(valueMolM3, unitId, airDensity) {
  return unitId === 'ppb' ? valueMolM3 / (1e-9 * airDensity) : valueMolM3
}
