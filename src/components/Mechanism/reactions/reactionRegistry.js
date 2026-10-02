// The species fields of each reaction type, in column order. `single` holds one species name
// as a plain string (SURFACE); `required` fields cannot be left empty when a reaction is added.
const BOTH = [
  { key: 'reactants', required: true },
  { key: 'products', required: true },
]
// Photolysis and user-defined reactions may leave the products empty.
const SCALED = [{ key: 'reactants', required: true }, { key: 'products' }]
const EMISSION = [{ key: 'products', required: true }]
const LOSS = [{ key: 'reactants', required: true }]
const BRANCHED = [
  { key: 'reactants', required: true },
  { key: 'alkoxy products', required: true },
  { key: 'nitrate products', required: true },
]
const SURFACE_SHAPE = [
  { key: 'gas-phase species', single: true, required: true },
  { key: 'gas-phase products', required: true },
]

// Units of the rate parameters, from the rate expression of each type (e.g. Arrhenius
// k = A exp(C/T) (T/D)^B (1 + E P)). A rate-constant factor depends on the reaction order, so it
// is written with n, the number of reactants; a low-pressure limit k0 has one more order for the
// third body.
const RATE = '(mol m-3)^(1-n) s-1'
const LOW_PRESSURE_RATE = '(mol m-3)^(-n) s-1'
const UNITLESS = 'unitless'

// What the n in a rate unit means, for a tooltip.
export const RATE_UNIT_NOTE = 'n is the number of reactants of the reaction.'
export const isOrderDependentUnit = (unit) => unit === RATE || unit === LOW_PRESSURE_RATE

export const reactionRegistry = [
  {
    type: 'ARRHENIUS',
    parameters: [
      { key: 'A', placeholder: '1.0', unit: RATE },
      { key: 'B', placeholder: '0.0', unit: UNITLESS },
      { key: 'C', placeholder: '0.0', unit: 'K' },
      { key: 'D', placeholder: '300.0', unit: 'K' },
      { key: 'E', placeholder: '0.0', unit: 'Pa-1' },
    ],
    label: 'Arrhenius',
    components: BOTH,
  },
  {
    type: 'EMISSION',
    parameters: [{ key: 'scaling factor', placeholder: '1.0', unit: UNITLESS }],
    label: 'Emission',
    components: EMISSION,
  },
  {
    type: 'FIRST_ORDER_LOSS',
    parameters: [{ key: 'scaling factor', placeholder: '1.0', unit: UNITLESS }],
    label: 'First-order loss',
    components: LOSS,
  },
  {
    type: 'PHOTOLYSIS',
    parameters: [{ key: 'scaling factor', placeholder: '1.0', unit: UNITLESS }],
    label: 'Photolysis',
    components: SCALED,
  },
  {
    type: 'TERNARY_CHEMICAL_ACTIVATION',
    parameters: [
      { key: 'k0_A', placeholder: '1.0', unit: LOW_PRESSURE_RATE },
      { key: 'k0_B', placeholder: '0.0', unit: UNITLESS },
      { key: 'k0_C', placeholder: '0.0', unit: 'K' },
      { key: 'kinf_A', placeholder: '1.0', unit: RATE },
      { key: 'kinf_B', placeholder: '0.0', unit: UNITLESS },
      { key: 'kinf_C', placeholder: '0.0', unit: 'K' },
      { key: 'Fc', placeholder: '0.6', unit: UNITLESS },
      { key: 'N', placeholder: '1.0', unit: UNITLESS },
    ],
    label: 'Ternary chemical activation',
    components: BOTH,
  },
  {
    type: 'TROE',
    parameters: [
      { key: 'k0_A', placeholder: '1.0', unit: LOW_PRESSURE_RATE },
      { key: 'k0_B', placeholder: '0.0', unit: UNITLESS },
      { key: 'k0_C', placeholder: '0.0', unit: 'K' },
      { key: 'kinf_A', placeholder: '1.0', unit: RATE },
      { key: 'kinf_B', placeholder: '0.0', unit: UNITLESS },
      { key: 'kinf_C', placeholder: '0.0', unit: 'K' },
      { key: 'Fc', placeholder: '0.6', unit: UNITLESS },
      { key: 'N', placeholder: '1.0', unit: UNITLESS },
    ],
    label: 'Troe (Fall-off)',
    components: BOTH,
  },
  {
    type: 'BRANCHED_NO_RO2',
    parameters: [
      { key: 'X', placeholder: '1.0', unit: RATE },
      { key: 'Y', placeholder: '0.0', unit: 'K' },
      { key: 'a0', placeholder: '1.0', unit: UNITLESS },
      { key: 'n', placeholder: '0', unit: UNITLESS },
    ],
    label: 'Branched',
    components: BRANCHED,
  },
  {
    type: 'TUNNELING',
    parameters: [
      { key: 'A', placeholder: '1.0', unit: RATE },
      { key: 'B', placeholder: '0.0', unit: 'K' },
      { key: 'C', placeholder: '0.0', unit: 'K3' },
    ],
    label: 'Tunneling',
    components: BOTH,
  },
  {
    type: 'SURFACE',
    parameters: [{ key: 'reaction probability', placeholder: '1.0', unit: UNITLESS }],
    label: 'Surface',
    components: SURFACE_SHAPE,
  },
  {
    type: 'USER_DEFINED',
    parameters: [{ key: 'scaling factor', placeholder: '1.0', unit: UNITLESS }],
    label: 'User-defined rate',
    components: SCALED,
  },
  {
    type: 'LAMBDA_RATE_CONSTANT',
    parameters: [{ key: 'lambda function' }],
    label: 'Lambda rate',
    components: BOTH,
  },
]

// The species fields of a type (see the shapes above); an unknown type has reactants and products.
export const getReactionComponents = (reactionType) =>
  reactionRegistry.find((entry) => entry.type === reactionType)?.components ?? BOTH

export const getReactionDefinition = (reactionType) => {
  return (
    reactionRegistry.find((definition) => definition.type === reactionType) || reactionRegistry[0]
  )
}

// Title-case unknown types for readability: USER_DEFINED → "User defined".
const titleCase = (type) => {
  const words = String(type).replace(/_/g, ' ').toLowerCase().trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// Return the type's rate parameters with their solver defaults as placeholders when unset.
export const getReactionParameters = (reactionType) =>
  reactionRegistry.find((entry) => entry.type === reactionType)?.parameters ?? []

export const getReactionTypeLabel = (reactionType) => {
  const definition = reactionRegistry.find((entry) => entry.type === reactionType)
  return definition?.label ?? titleCase(reactionType)
}
