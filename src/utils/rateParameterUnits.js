import { AVOGADRO_CONSTANT } from './concentrationUnits'
import { getReactionReactants } from '../services/simulation/local/mechanism'

// The display units of rate parameters. The mechanism always stores SI values, in
// (m3 mol-1)^(order-1) s-1. The molecule unit is (cm3 molecule-1)^(order-1) s-1, as in the
// JPL kinetics evaluations. The app converts only for display and input.

export const RATE_UNIT_SYSTEMS = [
  { id: 'molecule', label: 'molecule cm-3' },
  { id: 'si', label: 'SI (mol m-3)' },
]
export const DEFAULT_RATE_UNIT = 'molecule'

// For each reaction type, the parameters that have a concentration unit. The value is the
// order of the parameter minus the order n of the reaction. It comes from the role of the
// parameter in the rate formula (rate_constant_functions.hpp in MICM):
//   Troe:                        k = k0[M] / (1 + k0[M]/kinf) F, so k0 has the order n + 1.
//   Ternary chemical activation: k = k0 / (1 + k0[M]/kinf) F, so kinf has the order n - 1.
// k0[M]/kinf has no unit, so kinf has the order of k0 minus 1. JPL gives the same units: for
// OH + CO, k0 is in cm3 molecule-1 s-1 and kinf is in s-1.
export const RATE_UNIT_PARAMETERS = {
  ARRHENIUS: { A: 0 },
  TROE: { k0_A: 1, kinf_A: 0 },
  TERNARY_CHEMICAL_ACTIVATION: { k0_A: 0, kinf_A: -1 },
  BRANCHED_NO_RO2: { X: 0 },
  TUNNELING: { A: 0 },
}

export const isRateUnitParameter = (type, key) => RATE_UNIT_PARAMETERS[type]?.[key] !== undefined

// The order n of a reaction: the sum of the reactant coefficients. A third body that the user
// lists as a reactant counts too.
export const reactionOrder = (reaction) =>
  getReactionReactants(reaction).reduce((sum, component) => {
    const coefficient = Number(component?.coefficient)
    return sum + (Number.isFinite(coefficient) ? coefficient : 1)
  }, 0)

// The order of one parameter of a reaction, or null when the parameter has no concentration
// unit.
export const parameterOrder = (reaction, key) => {
  const offset = RATE_UNIT_PARAMETERS[reaction?.type]?.[key]
  return offset === undefined ? null : reactionOrder(reaction) + offset
}

// The factor from an SI value to a molecule value: 1 m3 mol-1 = 1e6 / N_A cm3 molecule-1.
const moleculeFactor = (order) => (1e6 / AVOGADRO_CONSTANT) ** (order - 1)

export const toDisplayValue = (valueSI, unitId, order) =>
  unitId === 'molecule' && order !== null ? valueSI * moleculeFactor(order) : valueSI

export const fromDisplayValue = (value, unitId, order) =>
  unitId === 'molecule' && order !== null ? value / moleculeFactor(order) : value

// The space between two factors of a unit. A normal space after a superscript looks too
// narrow, so a thin space (U+2009) follows it. HTML does not collapse a thin space.
const GAP = ' \u2009'

// The unit for a known order, for FormulaText: "cm^3 molecule^-1 s^-1" or "m^3 mol^-1 s^-1".
// An order of 0 gives a concentration rate: "molecule cm^-3 s^-1" or "mol m^-3 s^-1".
export function rateUnitLabel(unitId, order) {
  const power = order - 1
  if (power === 0) return 's^-1'
  const volume = unitId === 'molecule' ? 'cm' : 'm'
  const amount = unitId === 'molecule' ? 'molecule' : 'mol'
  if (power < 0) {
    const amountPower = power === -1 ? '' : `^${-power}`
    return `${amount}${amountPower}${GAP}${volume}^${3 * power}${GAP}s^-1`
  }
  return `${volume}^${3 * power}${GAP}${amount}^-${power}${GAP}s^-1`
}

// The unit before the reactants are known, with n for the order of the reaction.
export function genericRateUnitLabel(unitId, offset) {
  // The exponent is n - 1 + offset.
  const exponent = offset === 1 ? 'n' : `(n-${1 - offset})`
  return unitId === 'molecule'
    ? `(cm^3${GAP}molecule^-1)^${exponent}${GAP}s^-1`
    : `(mol${GAP}m^-3)^-${exponent}${GAP}s^-1`
}
