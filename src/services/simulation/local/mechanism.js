import { PHASE_PROPERTY_KEYS } from './speciesProperties'
const normalizeReactionComponents = (components = []) => {
  return (components || []).map((component) => {
    if (!component || typeof component !== 'object') return component
    if (component['species name'] || !component.name) return component

    const { name, ...rest } = component
    return {
      ...rest,
      'species name': name,
    }
  })
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

    if (!sourceReaction || sourceReaction.type !== reaction?.type) {
      return reaction
    }

    if (!shouldUseSourceName(reaction, sourceReaction)) {
      return reaction
    }

    return {
      ...reaction,
      name: sourceReaction.name,
    }
  })
}

export const serializeReaction = (reaction) => {
  if (!reaction || typeof reaction !== 'object') {
    return reaction
  }

  const serialized = { ...reaction }
  delete serialized.id

  if (serialized.type === 'SURFACE_REACTION') serialized.type = 'SURFACE'
  if (serialized.type === 'BRANCHED') serialized.type = 'BRANCHED_NO_RO2'
  if (serialized.type === 'LAMBDA_RATE') serialized.type = 'LAMBDA_RATE_CONSTANT'

  if (serialized.scalingFactor !== undefined && serialized['scaling factor'] === undefined) {
    serialized['scaling factor'] = serialized.scalingFactor
  }
  delete serialized.scalingFactor

  if (serialized.lambdaFunction !== undefined && serialized['lambda function'] === undefined) {
    serialized['lambda function'] = serialized.lambdaFunction
  }
  delete serialized.lambdaFunction

  // Lambda callbacks are registered by label "Lambda.<name>" in MUSICA.
  if (
    serialized.type === 'LAMBDA_RATE_CONSTANT' &&
    (!serialized.name || !String(serialized.name).trim())
  ) {
    const lhs = Array.isArray(serialized.reactants)
      ? serialized.reactants
          .map((component) => component?.['species name'] || component?.name)
          .filter(Boolean)
          .join('_')
      : 'rxn'
    const rhs = Array.isArray(serialized.products)
      ? serialized.products
          .map((component) => component?.['species name'] || component?.name)
          .filter(Boolean)
          .join('_')
      : 'prod'
    serialized.name = `${lhs}_to_${rhs}`
  }

  if (serialized.reactants) serialized.reactants = normalizeReactionComponents(serialized.reactants)
  if (serialized.products) serialized.products = normalizeReactionComponents(serialized.products)
  if (serialized['gas-phase products'])
    serialized['gas-phase products'] = normalizeReactionComponents(serialized['gas-phase products'])
  if (serialized['alkoxy products'])
    serialized['alkoxy products'] = normalizeReactionComponents(serialized['alkoxy products'])
  if (serialized['nitrate products'])
    serialized['nitrate products'] = normalizeReactionComponents(serialized['nitrate products'])

  // UI surface reactions are authored as reactants/products; v1 expects gas-phase fields.
  if (serialized.type === 'SURFACE') {
    if (
      serialized['gas-phase species'] === undefined &&
      Array.isArray(serialized.reactants) &&
      serialized.reactants.length > 0
    ) {
      const firstReactant = serialized.reactants[0]
      serialized['gas-phase species'] =
        firstReactant?.['species name'] || firstReactant?.name || firstReactant
    }

    if (!serialized['gas-phase products'] && Array.isArray(serialized.products)) {
      serialized['gas-phase products'] = normalizeReactionComponents(serialized.products)
    }

    delete serialized.reactants
    delete serialized.products
  }

  return serialized
}

export const serializeSpecies = (species) => {
  if (!species || typeof species !== 'object') {
    return species
  }

  const {
    id: _id,
    molecular_weight_kg_mol,
    properties: _properties,
    phase: _phase,
    diffusion_coefficient_m2_s: _legacyDiffusion,
    ...serialized
  } = species

  for (const key of PHASE_PROPERTY_KEYS) {
    delete serialized[key]
  }

  if (
    serialized['molecular weight [kg mol-1]'] === undefined &&
    molecular_weight_kg_mol !== undefined
  ) {
    serialized['molecular weight [kg mol-1]'] = molecular_weight_kg_mol
  }

  return serialized
}

const phaseProperties = (name, species) => {
  const source = species.find((sp) => sp?.name === name)
  if (!source) {
    return {}
  }

  const attached = {}
  for (const key of PHASE_PROPERTY_KEYS) {
    if (source[key] !== undefined && source[key] !== null) {
      attached[key] = source[key]
    }
  }
  return attached
}

// Editor values take precedence over values authored in the mechanism file.
const toPhaseSpecies = (entry, species) => {
  const name = typeof entry === 'string' ? entry : entry?.name
  const base = typeof entry === 'string' ? { name } : { ...entry }
  return { ...base, ...phaseProperties(name, species) }
}

export const buildPhases = (sourceMechanism, species) => {
  if (Array.isArray(sourceMechanism.phases) && sourceMechanism.phases.length > 0) {
    return sourceMechanism.phases.map((phase) => ({
      ...phase,
      species: Array.isArray(phase.species)
        ? [
            ...phase.species
              .filter((sp) => species.some((s) => s.name === (sp.name || sp)))
              .map((sp) => toPhaseSpecies(sp, species)),
            ...species
              .filter((sp) => !phase.species.some((s) => (s.name || s) === sp.name))
              .map((sp) => toPhaseSpecies(sp.name, species)),
          ]
        : species.map((sp) => toPhaseSpecies(sp.name, species)),
    }))
  }

  return [
    {
      name: 'gas',
      species: species.map((sp) => toPhaseSpecies(sp.name, species)),
    },
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
const REACTION_COMPONENT_KEYS = [
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
