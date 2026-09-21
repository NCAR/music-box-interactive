import { mechanismConfiguration } from '@ncar/musica'
import { PHASE_PROPERTY_KEYS } from './speciesProperties'

const { types, reactionTypes } = mechanismConfiguration

// Builder classes prefix other_properties keys with `__` on serialization. A source object
// already in wire format has that prefix already, so strip it here or re-serializing would
// double it (`__description` -> `____description`), which MICM's parser rejects.
const unprefixOtherProperties = (obj) => {
  if (!obj || Object.keys(obj).length === 0) return undefined
  const stripped = {}
  for (const [key, value] of Object.entries(obj)) {
    stripped[key.startsWith('__') ? key.slice(2) : key] = value
  }
  return stripped
}

const speciesKey = (species) => {
  if (!species || typeof species !== 'object') return ''
  return String(species.name || '')
    .trim()
    .toUpperCase()
}

const mergeDefinedFields = (base, override) => {
  const merged = { ...(base || {}) }

  if (!override || typeof override !== 'object') {
    return merged
  }

  Object.entries(override).forEach(([key, value]) => {
    if (value !== undefined) {
      merged[key] = value
    }
  })

  return merged
}

export const reconcileSpeciesWithSource = (speciesList, sourceSpeciesList) => {
  if (!Array.isArray(speciesList) || speciesList.length === 0) {
    return []
  }

  if (!Array.isArray(sourceSpeciesList) || sourceSpeciesList.length === 0) {
    return speciesList
  }

  const sourceByName = new Map(
    sourceSpeciesList
      .filter((species) => species && typeof species === 'object')
      .map((species) => [speciesKey(species), species])
      .filter(([key]) => key.length > 0)
  )

  return speciesList.map((species) => {
    if (!species || typeof species !== 'object') {
      return species
    }

    const sourceSpecies = sourceByName.get(speciesKey(species))
    if (!sourceSpecies) {
      return species
    }

    // Preserve mechanism-authored fields (e.g., "is third body") unless
    // explicitly overridden by the UI state.
    return mergeDefinedFields(sourceSpecies, species)
  })
}

const getReactionSides = (reaction) => {
  const reactants = reaction?.reactants || reaction?.['gas-phase species'] || []
  const products =
    reaction?.products || reaction?.['gas-phase products'] || reaction?.['alkoxy products'] || []

  return {
    reactants: Array.isArray(reactants) ? reactants : [reactants],
    products: Array.isArray(products) ? products : [products],
  }
}

const formatReactionComponent = (component) => {
  if (typeof component === 'string') {
    return component.trim().toUpperCase()
  }

  if (!component || typeof component !== 'object') {
    return ''
  }

  const speciesName = (component['species name'] || component.name || '').trim().toUpperCase()
  const coefficient = Number(component.coefficient)
  const coeffPrefix = Number.isFinite(coefficient) && coefficient > 1 ? coefficient : ''

  return `${coeffPrefix}${speciesName}`
}

const toDisplayReactionName = (reaction) => {
  const { reactants, products } = getReactionSides(reaction)

  const reactantStr = reactants.map(formatReactionComponent).filter(Boolean).join(' + ') || '∅'

  const productStr =
    products.map(formatReactionComponent).filter(Boolean).join(' + ') || '(removed)'

  return `${reactantStr} -> ${productStr}`
}

const namesMatchCaseInsensitive = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  return a.trim().toUpperCase() === b.trim().toUpperCase()
}

const shouldUseSourceName = (reaction, sourceReaction) => {
  const sourceName = typeof sourceReaction?.name === 'string' ? sourceReaction.name.trim() : ''
  if (!sourceName) return false

  const currentName = typeof reaction?.name === 'string' ? reaction.name.trim() : ''
  if (!currentName) return true

  // If the current name is a UI-generated display reaction string,
  // restore the schema/mechanism-defined source name used by USER./PHOTO. keys.
  const displayFromCurrent = toDisplayReactionName(reaction)
  const displayFromSource = toDisplayReactionName(sourceReaction)
  return (
    namesMatchCaseInsensitive(currentName, displayFromCurrent) ||
    namesMatchCaseInsensitive(currentName, displayFromSource)
  )
}

export const reconcileReactionNamesWithSource = (reactions, sourceReactions) => {
  if (!Array.isArray(reactions) || reactions.length === 0) {
    return []
  }

  if (!Array.isArray(sourceReactions) || sourceReactions.length === 0) {
    return reactions
  }

  return reactions.map((reaction, index) => {
    const sourceReaction = sourceReactions[index]
    // reaction is a musica builder instance (or the unknown-type {getJSON} fallback), not a
    // plain object -- spreading it would lose its getJSON() method, so read through getJSON()
    // for the comparison and, if renaming, wrap it in a fresh getJSON() instead of copying it.
    const reactionJSON = reaction?.getJSON ? reaction.getJSON() : reaction

    if (!sourceReaction || sourceReaction.type !== reactionJSON?.type) {
      return reaction
    }

    if (!shouldUseSourceName(reactionJSON, sourceReaction)) {
      return reaction
    }

    const renamed = { ...reactionJSON, name: sourceReaction.name }
    return { getJSON: () => renamed }
  })
}

// A component may be a bare species-name string, or an object keyed either "species name"
// (what the reaction editor's text-box parser produces) or "name" (what an uploaded config,
// or musica's own ReactionComponent.getJSON(), produces).
const componentName = (component) => {
  if (typeof component === 'string') return component
  if (!component || typeof component !== 'object') return undefined
  return component['species name'] ?? component.name
}

const toReactionComponent = (component) => {
  if (!component || typeof component !== 'object') {
    return new types.ReactionComponent({ name: componentName(component) })
  }

  const { 'species name': _speciesName, name: _name, coefficient, ...otherProperties } = component

  return new types.ReactionComponent({
    name: componentName(component),
    coefficient,
    other_properties: unprefixOtherProperties(otherProperties),
  })
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
    properties: _properties,
    phase: _phase,
    diffusion_coefficient_m2_s: _legacyDiffusion,
    molecular_weight_kg_mol,
    name,
    'molecular weight [kg mol-1]': molecularWeight,
    'absolute tolerance': absoluteTolerance,
    '__absolute tolerance': legacyAbsoluteTolerance,
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
    molecular_weight: molecularWeight ?? molecular_weight_kg_mol,
    absolute_tolerance: absoluteTolerance ?? legacyAbsoluteTolerance,
    constant_concentration: constantConcentration,
    constant_mixing_ratio: constantMixingRatio,
    // Unlike Python's Species (is_third_body defaults to False), the JS class leaves this
    // undefined when unset. MICM expects it present, so default it here.
    is_third_body: isThirdBody ?? false,
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

      const phaseInstance = new types.Phase({
        name: phaseName,
        species: [...declared, ...undeclared],
      })

      // Phase's constructor (unlike every other builder class here) doesn't recognize
      // other_properties as its own param -- passing it gets treated as one more arbitrary
      // property to wrap, producing a bogus "__other_properties" key. otherPhaseProperties is
      // already in wire-format shape (it came straight from the source phase), so it's merged
      // into getJSON()'s result directly instead of going through the constructor.
      return { getJSON: () => ({ ...otherPhaseProperties, ...phaseInstance.getJSON() }) }
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
    mechanismData.mechanism?.mechanism?.name ||
    'local'
  )
}

const REACTION_TYPE_ALIASES = {
  SURFACE_REACTION: 'SURFACE',
  BRANCHED: 'BRANCHED_NO_RO2',
  LAMBDA_RATE: 'LAMBDA_RATE_CONSTANT',
}

const canonicalReactionType = (type) => REACTION_TYPE_ALIASES[type] ?? type

const scalingFactorOf = (reaction) => reaction['scaling factor'] ?? reaction.scalingFactor

// ARRHENIUS/TAYLOR_SERIES/TROE/TERNARY_CHEMICAL_ACTIVATION/TUNNELING all share this shape: a
// fixed set of numeric rate-constant fields, plus reactants/products.
const buildKineticReaction = (Class, fields, reaction, common, extra = {}) =>
  new Class({
    ...common,
    ...Object.fromEntries(fields.map((field) => [field, reaction[field]])),
    ...extra,
    reactants: toReactionComponents(reaction.reactants),
    products: toReactionComponents(reaction.products),
  })

const ARRHENIUS_FIELDS = ['A', 'B', 'C', 'D', 'E', 'Ea']
const TROE_LIKE_FIELDS = ['k0_A', 'k0_B', 'k0_C', 'kinf_A', 'kinf_B', 'kinf_C', 'Fc', 'N']

// EMISSION/PHOTOLYSIS/USER_DEFINED all share this shape: a scaling factor plus products (and,
// except for EMISSION, reactants).
const buildScaledReaction = (Class, reaction, common, { reactants = true } = {}) =>
  new Class({
    ...common,
    scaling_factor: scalingFactorOf(reaction),
    ...(reactants ? { reactants: toReactionComponents(reaction.reactants) } : {}),
    products: toReactionComponents(reaction.products),
  })

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

// Keys every reaction type already reads explicitly below; anything left over on the Redux
// reaction object (e.g. from an uploaded config with a custom property) is preserved through
// other_properties instead of being silently dropped.
const COMMON_REACTION_KEYS = [
  'id', 'type', 'name', 'gas phase', 'gasPhase',
  'reactants', 'products', 'nitrate products', 'alkoxy products',
  'gas-phase species', 'gas-phase products',
  'scaling factor', 'scalingFactor', 'reaction probability', 'reactionProbability',
  'lambda function', 'lambdaFunction', 'taylor coefficients',
  ...ARRHENIUS_FIELDS, ...TROE_LIKE_FIELDS, 'X', 'Y', 'a0', 'n',
]

const otherReactionProperties = (reaction) => {
  const rest = { ...reaction }
  for (const key of COMMON_REACTION_KEYS) {
    delete rest[key]
  }
  return unprefixOtherProperties(rest)
}

export const serializeReaction = (reaction) => {
  if (!reaction || typeof reaction !== 'object') {
    return reaction
  }

  const type = canonicalReactionType(reaction.type)
  const gasPhase = reaction['gas phase'] ?? reaction.gasPhase
  const otherProperties = otherReactionProperties(reaction)
  const name =
    type === 'LAMBDA_RATE_CONSTANT' && !String(reaction.name || '').trim()
      ? generatedLambdaName(reaction)
      : reaction.name

  const common = { name, gas_phase: gasPhase, other_properties: otherProperties }

  switch (type) {
    case 'ARRHENIUS':
      return buildKineticReaction(reactionTypes.Arrhenius, ARRHENIUS_FIELDS, reaction, common)

    case 'BRANCHED_NO_RO2':
      return new reactionTypes.Branched({
        ...common,
        X: reaction.X,
        Y: reaction.Y,
        a0: reaction.a0,
        n: reaction.n,
        reactants: toReactionComponents(reaction.reactants),
        nitrate_products: toReactionComponents(reaction['nitrate products']),
        alkoxy_products: toReactionComponents(reaction['alkoxy products']),
      })

    case 'EMISSION':
      return buildScaledReaction(reactionTypes.Emission, reaction, common, { reactants: false })

    case 'FIRST_ORDER_LOSS':
      return new reactionTypes.FirstOrderLoss({
        ...common,
        scaling_factor: scalingFactorOf(reaction),
        reactants: toReactionComponents(reaction.reactants),
        products: reaction.products ? toReactionComponents(reaction.products) : undefined,
      })

    case 'PHOTOLYSIS':
      return buildScaledReaction(reactionTypes.Photolysis, reaction, common)

    case 'SURFACE': {
      const gasPhaseSpeciesSource = reaction['gas-phase species'] ?? reaction.reactants?.[0]
      return new reactionTypes.Surface({
        ...common,
        reaction_probability: reaction['reaction probability'] ?? reaction.reactionProbability,
        gas_phase_species: toReactionComponent(gasPhaseSpeciesSource),
        gas_phase_products: toReactionComponents(
          reaction['gas-phase products'] ?? reaction.products
        ),
      })
    }

    case 'TAYLOR_SERIES':
      return buildKineticReaction(reactionTypes.TaylorSeries, ARRHENIUS_FIELDS, reaction, common, {
        taylor_coefficients: reaction['taylor coefficients'],
      })

    case 'TROE':
      return buildKineticReaction(reactionTypes.Troe, TROE_LIKE_FIELDS, reaction, common)

    case 'TERNARY_CHEMICAL_ACTIVATION':
      return buildKineticReaction(
        reactionTypes.TernaryChemicalActivation,
        TROE_LIKE_FIELDS,
        reaction,
        common
      )

    case 'TUNNELING':
      return buildKineticReaction(reactionTypes.Tunneling, ['A', 'B', 'C'], reaction, common)

    case 'USER_DEFINED':
      return buildScaledReaction(reactionTypes.UserDefined, reaction, common)

    case 'LAMBDA_RATE_CONSTANT':
      return new reactionTypes.LambdaRateConstant({
        ...common,
        lambda_function: reaction['lambda function'] ?? reaction.lambdaFunction,
        reactants: toReactionComponents(reaction.reactants),
        products: toReactionComponents(reaction.products),
      })

    default: {
      // An unrecognized type (e.g. authored via the generic reaction form) has no musica
      // builder class to construct -- fall back to passing it through with normalized
      // reactant/product components, same as before this file went through musica's APIs.
      const serialized = { ...reaction, type: reaction.type }
      delete serialized.id
      delete serialized.scalingFactor
      delete serialized.lambdaFunction
      if (serialized.reactants) {
        serialized.reactants = toReactionComponents(serialized.reactants).map((c) => c.getJSON())
      }
      if (serialized.products) {
        serialized.products = toReactionComponents(serialized.products).map((c) => c.getJSON())
      }
      return { getJSON: () => serialized }
    }
  }
}

const extractSpeciesNames = (components) => {
  if (!Array.isArray(components)) {
    return []
  }

  return components
    .map((component) => {
      if (!component) return null
      if (typeof component === 'string') return component
      if (typeof component === 'object') return component['species name'] || component.name || null
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

// Rewrites reaction species names to match the mechanism's spelling, case-insensitively.
// This allows upper-cased editor input to reference mechanisms with lower-case species names.
export const resolveReactionSpeciesNames = (reaction, definedNames = []) => {
  if (!reaction || typeof reaction !== 'object') {
    return reaction
  }

  const byLowerCase = new Map()
  for (const name of definedNames) {
    if (typeof name === 'string') {
      byLowerCase.set(name.toLowerCase(), name)
    }
  }

  const resolveName = (name) =>
    typeof name === 'string' ? (byLowerCase.get(name.toLowerCase()) ?? name) : name

  const resolveComponent = (component) => {
    if (typeof component === 'string') {
      return resolveName(component)
    }
    if (!component || typeof component !== 'object') {
      return component
    }
    if (component['species name'] !== undefined) {
      return { ...component, 'species name': resolveName(component['species name']) }
    }
    if (component.name !== undefined) {
      return { ...component, name: resolveName(component.name) }
    }
    return component
  }

  const resolved = { ...reaction }

  for (const key of REACTION_COMPONENT_KEYS) {
    if (Array.isArray(resolved[key])) {
      resolved[key] = resolved[key].map(resolveComponent)
    }
  }

  if (typeof resolved['gas-phase species'] === 'string') {
    resolved['gas-phase species'] = resolveName(resolved['gas-phase species'])
  }

  return resolved
}

export const validateMechanismPayload = (mechanismPayload) => {
  const speciesNames = new Set(
    (mechanismPayload.species || [])
      .map((species) => (typeof species === 'string' ? species : species?.name))
      .filter(Boolean)
  )

  const unknownSpecies = new Set()

  ;(mechanismPayload.reactions || []).forEach((reaction) => {
    if (!reaction || typeof reaction !== 'object') return

    getReactionSpeciesNames(reaction).forEach((name) => {
      if (!speciesNames.has(name)) {
        unknownSpecies.add(name)
      }
    })
  })

  if (unknownSpecies.size > 0) {
    throw new Error(
      `Unknown species in reactions for this mechanism: ${Array.from(unknownSpecies).join(', ')}`
    )
  }
}
