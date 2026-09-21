import { mechanismConfiguration } from '@ncar/musica'
import { MusicBox } from '@ncar/music-box'
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

export const buildLocalSimulationPayload = ({ mechanismData, conditions }) => {
  const sourceMechanism = mechanismData.mechanism?.mechanism || {}
  const mechanismLabel = getMechanismLabel(mechanismData)
  const sourceSpecies = Array.isArray(sourceMechanism.species) ? sourceMechanism.species : []

  // serializeSpecies strips PhaseSpecies properties, so buildPhases uses the pre-serialization
  // species to re-attach them to the phase entries.
  const reconciledSpecies = reconcileSpeciesWithSource(
    mechanismData.species.length > 0 ? mechanismData.species : sourceSpecies,
    sourceSpecies
  )
  const species = reconciledSpecies.map(serializeSpecies)

  const reactions =
    mechanismData.reactions.length > 0
      ? mechanismData.reactions.map(serializeReaction)
      : (sourceMechanism.reactions || []).map(serializeReaction)

  const reconciledReactions = reconcileReactionNamesWithSource(
    reactions,
    sourceMechanism.reactions || []
  )

  const phases = buildPhases(sourceMechanism, reconciledSpecies)

  const mechanismInstance = new mechanismConfiguration.Mechanism({
    name:
      sourceMechanism.name ||
      mechanismData.currentExample?.name ||
      mechanismData.currentExample ||
      'custom',
    version: sourceMechanism.version || '1.0.0',
    species,
    phases,
    reactions: reconciledReactions,
  })

  // Mechanism's constructor only recognizes name/version/species/phases/reactions -- any other
  // top-level mechanism property from an uploaded config (there is no other_properties support
  // here, unlike every other builder class) is merged in directly instead of being dropped.
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

  validateMechanismPayload(payload.mechanism)

  return {
    payload,
    mechanismLabel,
  }
}
