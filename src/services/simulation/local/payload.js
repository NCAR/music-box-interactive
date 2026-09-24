import { MusicBox } from '@ncar/music-box'
import { buildSolverConditions } from './conditions'
import { getMechanismLabel, serializeReaction } from './mechanism'

export const buildLocalSimulationPayload = ({ mechanismData, conditions }) => {
  const sourceMechanism = mechanismData.config?.mechanism || {}
  const mechanismLabel = getMechanismLabel(mechanismData)
  const species = sourceMechanism.species ?? []
  const phases = sourceMechanism.phases ?? []
  const reactions = (sourceMechanism.reactions ?? []).map(serializeReaction)

  const mechanism = {
    name:
      sourceMechanism.name ||
      mechanismData.currentExample?.name ||
      mechanismData.currentExample ||
      'custom',
    version: sourceMechanism.version || '1.0.0',
    species,
    phases,
    reactions,
  }

  const box = new MusicBox()
  box.chemTimeStep = conditions.basic.timeStep
  box.outputTimeStep = conditions.basic.outputFrequency
  box.simulationLength = conditions.basic.duration
  box.loadMechanism(mechanism)
  box.loadConditions(buildSolverConditions(conditions))

  const payload = box.toJson()

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

  return {
    payload,
    mechanismLabel,
  }
}
