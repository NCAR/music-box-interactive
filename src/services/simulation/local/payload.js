import { buildSolverConditions } from './conditions'
import {
  buildPhases,
  getMechanismLabel,
  reconcileReactionNamesWithSource,
  reconcileSpeciesWithSource,
  serializeReaction,
  serializeSpecies,
  validateMechanismPayload,
} from './mechanism'

const toSolverSpecies = (species = []) => {
  return species.map((sp) => {
    if (!sp || typeof sp !== 'object') {
      return sp
    }

    return {
      ...sp,
      'is third body': Object.prototype.hasOwnProperty.call(sp, 'is third body')
        ? sp['is third body']
        : false,
    }
  })
}

export const buildLocalSimulationPayload = ({ mechanismData, conditions }) => {
  const sourceMechanism = mechanismData.mechanism?.mechanism || {}
  const mechanismLabel = getMechanismLabel(mechanismData)
  const sourceSpecies = Array.isArray(sourceMechanism.species) ? sourceMechanism.species : []

  const species = reconcileSpeciesWithSource(
    mechanismData.species.length > 0 ? mechanismData.species : sourceSpecies,
    sourceSpecies
  ).map(serializeSpecies)

  const reactions =
    mechanismData.reactions.length > 0
      ? mechanismData.reactions.map(serializeReaction)
      : (sourceMechanism.reactions || []).map(serializeReaction)

  const reconciledReactions = reconcileReactionNamesWithSource(
    reactions,
    sourceMechanism.reactions || []
  )

  const phases = buildPhases(sourceMechanism, species)

  const payload = {
    'box model options': {
      grid: 'box',
      'chemistry time step [sec]': conditions.basic.timeStep,
      'output time step [sec]': conditions.basic.outputFrequency,
      'simulation length [sec]': conditions.basic.duration,
    },
    conditions: buildSolverConditions(conditions),
    mechanism: {
      ...sourceMechanism,
      name:
        sourceMechanism.name ||
        mechanismData.currentExample?.name ||
        mechanismData.currentExample ||
        'custom',
      reactions: reconciledReactions,
      species: toSolverSpecies(species),
      phases,
      version: sourceMechanism.version || '1.0.0',
    },
  }

  if (
    !payload.mechanism ||
    !Array.isArray(payload.mechanism.species) ||
    !Array.isArray(payload.mechanism.reactions)
  ) {
    throw new Error(
      'Invalid mechanism payload: expected mechanism.species[] and mechanism.reactions[] before solve()'
    )
  }

  if (!Array.isArray(payload.conditions?.data) || payload.conditions.data.length === 0) {
    throw new Error(
      'Invalid conditions payload: expected conditions.data[] with at least one block'
    )
  }

  validateMechanismPayload(payload.mechanism)

  return {
    payload,
    mechanismLabel,
  }
}
