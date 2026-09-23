import { mechanismConfiguration } from '@ncar/music-box'
import { PHASE_PROPERTY_KEYS } from './speciesProperties'

const { types, reactionTypes } = mechanismConfiguration

// Remove the `__` prefix from any other_properties keys
// musica adds these on serialization automatically
const unprefixOtherProperties = (obj) => {
  if (!obj || Object.keys(obj).length === 0) return undefined
  const stripped = {}
  for (const [key, value] of Object.entries(obj)) {
    stripped[key.startsWith('__') ? key.slice(2) : key] = value
  }
  return stripped
}

// Convert a Redux reaction component into a musica ReactionComponent.
const toReactionComponent = (component) => {
  const { name, coefficient, ...rest } = component
  return new types.ReactionComponent({ name, coefficient, ...unprefixOtherProperties(rest) })
}

const toReactionComponents = (components) => {
  if (!components) return []
  return (Array.isArray(components) ? components : [components]).map(toReactionComponent)
}

export const serializeSpecies = (species) => {
  if (!species || typeof species !== 'object') {
    return species
  }

  const {
    id: _id,
    phase: _phase,
    name,
    'molecular weight [kg mol-1]': molecularWeight,
    'absolute tolerance': absoluteTolerance,
    'constant concentration [mol m-3]': constantConcentration,
    'constant mixing ratio [mol mol-1]': constantMixingRatio,
    'is third body': isThirdBody,
    ...rest
  } = species

  // Phase-only properties (diffusion coefficient, density) belong on phases[].species[].
  for (const key of PHASE_PROPERTY_KEYS) {
    delete rest[key]
  }

  return new types.Species({
    name,
    molecular_weight: molecularWeight,
    absolute_tolerance: absoluteTolerance,
    constant_concentration: constantConcentration,
    constant_mixing_ratio: constantMixingRatio,
    is_third_body: isThirdBody,
    other_properties: unprefixOtherProperties(rest),
  })
}

// Diffusion coefficient/density can come from either the species editor's state (which the
// UI writes to) or the phase's own original species entry (where an uploaded config stores
// them). The editor's value wins when both are set, matching the previous behavior.
const toPhaseSpeciesInstance = (name, sourceSpeciesList, sourcePhaseSpecies) => {
  const source = sourceSpeciesList.find((sp) => sp?.name === name)
  const {
    name: _phaseSpeciesName,
    'diffusion coefficient [m2 s-1]': phaseEntryDiffusion,
    'density [kg m-3]': phaseEntryDensity,
    ...otherPhaseSpeciesProperties
  } = typeof sourcePhaseSpecies === 'object' && sourcePhaseSpecies ? sourcePhaseSpecies : {}

  return new types.PhaseSpecies({
    name,
    diffusion_coefficient: source?.['diffusion coefficient [m2 s-1]'] ?? phaseEntryDiffusion,
    density: source?.['density [kg m-3]'] ?? phaseEntryDensity,
    other_properties: unprefixOtherProperties(otherPhaseSpeciesProperties),
  })
}

export const buildPhases = (sourceMechanism, species) => {
  if (Array.isArray(sourceMechanism.phases) && sourceMechanism.phases.length > 0) {
    return sourceMechanism.phases.map((phase) => {
      const phaseSpeciesList = Array.isArray(phase.species) ? phase.species : []
      const declaredNames = new Set(phaseSpeciesList.map((sp) => sp?.name || sp))
      const { name: phaseName, species: _phaseSpecies, ...otherPhaseProperties } = phase

      const declared = phaseSpeciesList
        .filter((sp) => species.some((s) => s.name === (sp?.name || sp)))
        .map((sp) => toPhaseSpeciesInstance(sp?.name || sp, species, sp))
      const undeclared = species
        .filter((sp) => !declaredNames.has(sp.name))
        .map((sp) => toPhaseSpeciesInstance(sp.name, species))

      return new types.Phase({
        name: phaseName,
        species: [...declared, ...undeclared],
        ...unprefixOtherProperties(otherPhaseProperties),
      })
    })
  }

  return [
    new types.Phase({
      name: 'gas',
      species: species.map((sp) => toPhaseSpeciesInstance(sp.name, species)),
    }),
  ]
}

export const getMechanismLabel = (mechanismData) => {
  return (
    mechanismData.currentExample?.name ||
    mechanismData.currentExample?.mechanism_name ||
    mechanismData.config?.mechanism?.name ||
    'local'
  )
}

// The reaction editor uses these registry type names; the solver uses the canonical names.
const REACTION_TYPE_ALIASES = {
  SURFACE_REACTION: 'SURFACE',
  BRANCHED: 'BRANCHED_NO_RO2',
  LAMBDA_RATE: 'LAMBDA_RATE_CONSTANT',
}

const generatedLambdaName = (reaction) => {
  const lhs =
    toReactionComponents(reaction.reactants)
      .map((c) => c.name)
      .filter(Boolean)
      .join('_') || 'rxn'
  const rhs =
    toReactionComponents(reaction.products)
      .map((c) => c.name)
      .filter(Boolean)
      .join('_') || 'prod'
  return `${lhs}_to_${rhs}`
}

// Fields every reaction type shares. Any key that a type's builder below does not read stays
// in `rest` and goes to the musica class as an unrecognized param, which keeps it in
// other_properties.
const common = ({ id: _id, type: _type, name, 'gas phase': gas_phase, ...rest }) => ({
  name,
  gas_phase,
  ...unprefixOtherProperties(rest),
})

// One builder for each reaction type: each maps the Redux (wire-format) fields directly onto
// the constructor params of the musica class.
const REACTION_BUILDERS = {
  ARRHENIUS: ({ A, B, C, D, E, Ea, reactants, products, ...rest }) =>
    new reactionTypes.Arrhenius({
      ...common(rest),
      A,
      B,
      C,
      D,
      E,
      Ea,
      reactants: toReactionComponents(reactants),
      products: toReactionComponents(products),
    }),

  BRANCHED_NO_RO2: ({
    X,
    Y,
    a0,
    n,
    reactants,
    'nitrate products': nitrate,
    'alkoxy products': alkoxy,
    ...rest
  }) =>
    new reactionTypes.Branched({
      ...common(rest),
      X,
      Y,
      a0,
      n,
      reactants: toReactionComponents(reactants),
      nitrate_products: toReactionComponents(nitrate),
      alkoxy_products: toReactionComponents(alkoxy),
    }),

  EMISSION: ({ 'scaling factor': scaling_factor, products, ...rest }) =>
    new reactionTypes.Emission({
      ...common(rest),
      scaling_factor,
      products: toReactionComponents(products),
    }),

  FIRST_ORDER_LOSS: ({ 'scaling factor': scaling_factor, reactants, products, ...rest }) =>
    new reactionTypes.FirstOrderLoss({
      ...common(rest),
      scaling_factor,
      reactants: toReactionComponents(reactants),
      products: toReactionComponents(products),
    }),

  PHOTOLYSIS: ({ 'scaling factor': scaling_factor, reactants, products, ...rest }) =>
    new reactionTypes.Photolysis({
      ...common(rest),
      scaling_factor,
      reactants: toReactionComponents(reactants),
      products: toReactionComponents(products),
    }),

  SURFACE: ({
    'reaction probability': reaction_probability,
    'gas-phase species': species,
    'gas-phase products': products,
    ...rest
  }) =>
    new reactionTypes.Surface({
      ...common(rest),
      reaction_probability,
      gas_phase_species: new types.ReactionComponent({ name: species }),
      gas_phase_products: toReactionComponents(products),
    }),

  TAYLOR_SERIES: ({
    A,
    B,
    C,
    D,
    E,
    Ea,
    'taylor coefficients': taylor_coefficients,
    reactants,
    products,
    ...rest
  }) =>
    new reactionTypes.TaylorSeries({
      ...common(rest),
      A,
      B,
      C,
      D,
      E,
      Ea,
      taylor_coefficients,
      reactants: toReactionComponents(reactants),
      products: toReactionComponents(products),
    }),

  TROE: ({ k0_A, k0_B, k0_C, kinf_A, kinf_B, kinf_C, Fc, N, reactants, products, ...rest }) =>
    new reactionTypes.Troe({
      ...common(rest),
      k0_A,
      k0_B,
      k0_C,
      kinf_A,
      kinf_B,
      kinf_C,
      Fc,
      N,
      reactants: toReactionComponents(reactants),
      products: toReactionComponents(products),
    }),

  TERNARY_CHEMICAL_ACTIVATION: ({
    k0_A,
    k0_B,
    k0_C,
    kinf_A,
    kinf_B,
    kinf_C,
    Fc,
    N,
    reactants,
    products,
    ...rest
  }) =>
    new reactionTypes.TernaryChemicalActivation({
      ...common(rest),
      k0_A,
      k0_B,
      k0_C,
      kinf_A,
      kinf_B,
      kinf_C,
      Fc,
      N,
      reactants: toReactionComponents(reactants),
      products: toReactionComponents(products),
    }),

  TUNNELING: ({ A, B, C, reactants, products, ...rest }) =>
    new reactionTypes.Tunneling({
      ...common(rest),
      A,
      B,
      C,
      reactants: toReactionComponents(reactants),
      products: toReactionComponents(products),
    }),

  USER_DEFINED: ({ 'scaling factor': scaling_factor, reactants, products, ...rest }) =>
    new reactionTypes.UserDefined({
      ...common(rest),
      scaling_factor,
      reactants: toReactionComponents(reactants),
      products: toReactionComponents(products),
    }),

  LAMBDA_RATE_CONSTANT: ({ 'lambda function': lambda_function, reactants, products, ...rest }) =>
    new reactionTypes.LambdaRateConstant({
      ...common(rest),
      lambda_function,
      reactants: toReactionComponents(reactants),
      products: toReactionComponents(products),
    }),
}

export const serializeReaction = (reaction) => {
  if (!reaction || typeof reaction !== 'object') {
    return reaction
  }

  const type = REACTION_TYPE_ALIASES[reaction.type] ?? reaction.type
  const build = REACTION_BUILDERS[type]

  if (!build) {
    // An unrecognized type (e.g. authored via the generic reaction form) has no musica
    // builder class, so pass it through with normalized reactant/product components.
    const { id: _id, ...serialized } = reaction
    if (serialized.reactants) {
      serialized.reactants = toReactionComponents(serialized.reactants).map((c) => c.getJSON())
    }
    if (serialized.products) {
      serialized.products = toReactionComponents(serialized.products).map((c) => c.getJSON())
    }
    return { getJSON: () => serialized }
  }

  if (type === 'LAMBDA_RATE_CONSTANT' && !String(reaction.name || '').trim()) {
    return build({ ...reaction, name: generatedLambdaName(reaction) })
  }
  return build(reaction)
}

const extractSpeciesNames = (components) => {
  if (!Array.isArray(components)) {
    return []
  }

  return components
    .map((component) => {
      if (!component) return null
      if (typeof component === 'string') return component
      if (typeof component === 'object') return component.name || null
      return null
    })
    .filter(Boolean)
}

// Component arrays supported by the reaction, varying by reaction type.
export const REACTION_COMPONENT_KEYS = [
  'reactants',
  'products',
  'gas-phase products',
  'alkoxy products',
  'nitrate products',
]

// MechanismConfiguration accepts a component as a bare species-name string, or as an object
// keyed by the canonical "name" or the legacy "species name" alias. Rewrite each one to
// `{ name, ... }` so the rest of the app reads only "name".
const normalizeComponent = (component) => {
  if (typeof component === 'string') return { name: component }
  if (!component || typeof component !== 'object' || !('species name' in component)) {
    return component
  }
  const { 'species name': speciesName, ...rest } = component
  return { name: speciesName, ...rest }
}

export const normalizeReactionComponents = (reaction) => {
  const normalized = { ...reaction }
  for (const key of REACTION_COMPONENT_KEYS) {
    if (Array.isArray(normalized[key])) {
      normalized[key] = normalized[key].map(normalizeComponent)
    }
  }
  return normalized
}

// All species referenced by a reaction across its type-specific component arrays.
export const getReactionSpeciesNames = (reaction) => {
  if (!reaction || typeof reaction !== 'object') {
    return []
  }

  const referenced = REACTION_COMPONENT_KEYS.flatMap((key) => extractSpeciesNames(reaction[key]))

  // SURFACE reactions reference gas-phase species by bare string name.
  if (typeof reaction['gas-phase species'] === 'string') {
    referenced.push(reaction['gas-phase species'])
  }

  return referenced
}
