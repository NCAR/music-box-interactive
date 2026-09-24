import { PHASE_PROPERTY_KEYS } from './speciesProperties'

const omitUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined))

// Phase-only properties (diffusion coefficient, density) belong on phases[].species[].
export const serializeSpecies = ({ id: _id, phase: _phase, ...species }) => {
  for (const key of PHASE_PROPERTY_KEYS) {
    delete species[key]
  }
  return species
}

// Diffusion coefficient/density can come from either the species editor's state (which the
// UI writes to) or the phase's own original species entry (where an uploaded config stores
// them). The editor's value wins when both are set.
const toPhaseSpecies = (name, sourceSpeciesList, sourcePhaseSpecies = {}) => {
  const source = sourceSpeciesList.find((sp) => sp?.name === name)
  return omitUndefined({
    ...sourcePhaseSpecies,
    name,
    'diffusion coefficient [m2 s-1]':
      source?.['diffusion coefficient [m2 s-1]'] ??
      sourcePhaseSpecies['diffusion coefficient [m2 s-1]'],
    'density [kg m-3]': source?.['density [kg m-3]'] ?? sourcePhaseSpecies['density [kg m-3]'],
  })
}

// The editor stores one phase on each species, but a config can list a species in more than one
// phase. A species keeps all the phases that list it when its editor phase is one of them. Otherwise
// (a new species, or one the user moved) it goes only into its editor phase.
const phasesOfSpecies = (sp, sourcePhases) => {
  const listedIn = sourcePhases
    .filter((phase) => phase.species.some((entry) => entry.name === sp.name))
    .map((phase) => phase.name)
  const editorPhase = sp.phase ?? 'gas'
  return listedIn.includes(editorPhase) ? listedIn : [editorPhase]
}

export const buildPhases = (sourceMechanism, species) => {
  const sourcePhases = Array.isArray(sourceMechanism.phases) ? sourceMechanism.phases : []
  const membership = new Map(species.map((sp) => [sp.name, phasesOfSpecies(sp, sourcePhases)]))

  // Keep the declared phases in their order, then add each new phase that a species names.
  const phaseNames = [
    ...new Set([...sourcePhases.map((phase) => phase.name), ...[...membership.values()].flat()]),
  ]

  return phaseNames.map((name) => {
    const source = sourcePhases.find((phase) => phase.name === name) ?? { name, species: [] }
    return {
      ...source,
      species: species
        .filter((sp) => membership.get(sp.name).includes(name))
        .map((sp) =>
          toPhaseSpecies(
            sp.name,
            species,
            source.species.find((entry) => entry.name === sp.name)
          )
        ),
    }
  })
}

export const getMechanismLabel = (mechanismData) => {
  return (
    mechanismData.currentExample?.name ||
    mechanismData.currentExample?.mechanism_name ||
    mechanismData.config?.mechanism?.name ||
    'local'
  )
}

const generatedLambdaName = (reaction) => {
  const names = (components) => (components ?? []).map((c) => c.name).filter(Boolean)
  const lhs = names(reaction.reactants).join('_') || 'rxn'
  const rhs = names(reaction.products).join('_') || 'prod'
  return `${lhs}_to_${rhs}`
}

export const serializeReaction = ({ id: _id, ...reaction }) => {
  if (reaction.type === 'LAMBDA_RATE_CONSTANT' && !String(reaction.name || '').trim()) {
    return { ...reaction, name: generatedLambdaName(reaction) }
  }
  return reaction
}

// Component arrays supported by the reaction, varying by reaction type.
export const REACTION_COMPONENT_KEYS = [
  'reactants',
  'products',
  'gas-phase products',
  'alkoxy products',
  'nitrate products',
]

// A reaction's reactant components. SURFACE stores its one reactant as the `gas-phase species`
// name, not as a component list, so it is converted to a component here.
export const getReactionReactants = (reaction) => {
  if (reaction?.reactants) return reaction.reactants
  const gasPhaseSpecies = reaction?.['gas-phase species']
  return gasPhaseSpecies ? [{ name: gasPhaseSpecies }] : []
}

// All species referenced by a reaction across its type-specific component arrays.
export const getReactionSpeciesNames = (reaction) => [
  ...REACTION_COMPONENT_KEYS.flatMap((key) => (reaction[key] ?? []).map((c) => c.name)),
  // SURFACE reactions reference their gas-phase species by name.
  ...(reaction['gas-phase species'] ? [reaction['gas-phase species']] : []),
]
