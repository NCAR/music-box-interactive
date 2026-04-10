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
  return String(species.name || '').trim().toUpperCase()
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
  const products = reaction?.products || reaction?.['gas-phase products'] || reaction?.['alkoxy products'] || []

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

  const reactantStr = reactants
    .map(formatReactionComponent)
    .filter(Boolean)
    .join(' + ') || '∅'

  const productStr = products
    .map(formatReactionComponent)
    .filter(Boolean)
    .join(' + ') || '(removed)'

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
  if (serialized.type === 'LAMBDA_RATE_CONSTANT' && (!serialized.name || !String(serialized.name).trim())) {
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
  if (serialized['gas-phase products']) serialized['gas-phase products'] = normalizeReactionComponents(serialized['gas-phase products'])
  if (serialized['alkoxy products']) serialized['alkoxy products'] = normalizeReactionComponents(serialized['alkoxy products'])
  if (serialized['nitrate products']) serialized['nitrate products'] = normalizeReactionComponents(serialized['nitrate products'])

  // UI surface reactions are authored as reactants/products; v1 expects gas-phase fields.
  if (serialized.type === 'SURFACE') {
    if (serialized['gas-phase species'] === undefined && Array.isArray(serialized.reactants) && serialized.reactants.length > 0) {
      const firstReactant = serialized.reactants[0]
      serialized['gas-phase species'] = firstReactant?.['species name'] || firstReactant?.name || firstReactant
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

  const serialized = { ...species }
  const molecularWeight = serialized.molecular_weight_kg_mol
  delete serialized.id
  delete serialized.properties
  delete serialized.molecular_weight_kg_mol

  if (serialized['molecular weight [kg mol-1]'] === undefined && molecularWeight !== undefined) {
    serialized['molecular weight [kg mol-1]'] = molecularWeight
  }

  return serialized
}

export const buildPhases = (sourceMechanism, species) => {
  if (Array.isArray(sourceMechanism.phases) && sourceMechanism.phases.length > 0) {
    return sourceMechanism.phases.map((phase) => ({
      ...phase,
      species: Array.isArray(phase.species)
        ? [
            ...phase.species.filter((sp) => species.some((s) => s.name === (sp.name || sp))),
            ...species
              .filter((sp) => !phase.species.some((s) => (s.name || s) === sp.name))
              .map((sp) => ({ name: sp.name })),
          ]
        : species.map((sp) => ({ name: sp.name })),
    }))
  }

  return [
    {
      name: 'gas',
      species: species.map((sp) => ({ name: sp.name })),
    },
  ]
}

export const getMechanismLabel = (mechanismData) => {
  return mechanismData.currentExample?.name
    || mechanismData.currentExample?.mechanism_name
    || mechanismData.mechanism?.mechanism?.name
    || 'local'
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

export const validateMechanismPayload = (mechanismPayload) => {
  const speciesNames = new Set(
    (mechanismPayload.species || [])
      .map((species) => (typeof species === 'string' ? species : species?.name))
      .filter(Boolean)
  )

  const unknownSpecies = new Set()

  ;(mechanismPayload.reactions || []).forEach((reaction) => {
    if (!reaction || typeof reaction !== 'object') return

    const referenced = [
      ...extractSpeciesNames(reaction.reactants),
      ...extractSpeciesNames(reaction.products),
      ...extractSpeciesNames(reaction['gas-phase products']),
      ...extractSpeciesNames(reaction['alkoxy products']),
      ...extractSpeciesNames(reaction['nitrate products']),
    ]

    if (typeof reaction['gas-phase species'] === 'string') {
      referenced.push(reaction['gas-phase species'])
    }

    referenced.forEach((name) => {
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
