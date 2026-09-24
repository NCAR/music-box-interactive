import { PHASE_PROPERTY_KEYS, pickDeclared } from './speciesProperties'

// The first phase that lists a species. The editor shows and edits this phase.
export const findSpeciesPhase = (phases, name) =>
  (phases ?? []).find((phase) => phase.species.some((entry) => entry.name === name))

// The mechanism stores phase membership and the phase-only species properties on
// phases[].species[]. The editor shows each species together with its phase and those properties.
export const withPhaseInfo = (species, phases) =>
  species.map((sp) => {
    const phase = findSpeciesPhase(phases, sp.name)
    const entry = phase?.species.find((e) => e.name === sp.name) ?? {}
    return { ...sp, ...pickDeclared(entry, PHASE_PROPERTY_KEYS), phase: phase?.name }
  })

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
