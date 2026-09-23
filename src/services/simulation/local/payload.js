import { MusicBox, mechanismConfiguration } from '@ncar/music-box'
import { buildSolverConditions } from './conditions'
import {
  buildPhases,
  getMechanismLabel,
  serializeReaction,
  serializeSpecies,
} from './mechanism'

export const buildLocalSimulationPayload = ({ mechanismData, conditions }) => {
  const sourceMechanism = mechanismData.config?.mechanism || {}
  const mechanismLabel = getMechanismLabel(mechanismData)
  const sourceSpecies = Array.isArray(sourceMechanism.species) ? sourceMechanism.species : []

  // serializeSpecies strips PhaseSpecies properties, so buildPhases uses the pre-serialization
  // species to re-attach them to the phase entries.
  const species = sourceSpecies.map(serializeSpecies)

  const reactions = (sourceMechanism.reactions || []).map(serializeReaction)

  const phases = buildPhases(sourceMechanism, sourceSpecies)

  const mechanismInstance = new mechanismConfiguration.Mechanism({
    name:
      sourceMechanism.name ||
      mechanismData.currentExample?.name ||
      mechanismData.currentExample ||
      'custom',
    version: sourceMechanism.version || '1.0.0',
    species,
    phases,
    reactions,
  })

  // Mechanism's constructor keeps only name/version/species/phases/reactions and drops every
  // other param (the other builder classes collect them into other_properties). So any other
  // top-level mechanism property from an uploaded config is merged in directly.
  const {
    name: _name,
    version: _version,
    species: _species,
    phases: _phases,
    reactions: _reactions,
    ...otherMechanismProperties
  } = sourceMechanism
  const box = new MusicBox()
  box.chemTimeStep = conditions.basic.timeStep
  box.outputTimeStep = conditions.basic.outputFrequency
  box.simulationLength = conditions.basic.duration
  box.loadMechanism({
    getJSON: () => ({ ...otherMechanismProperties, ...mechanismInstance.getJSON() }),
  })
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
