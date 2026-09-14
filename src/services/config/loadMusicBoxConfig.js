import { v4 as uuidv4 } from 'uuid'
import { parseBoxModelOptions } from '@ncar/music-box'
import {
  resetMechanism,
  addSpecies,
  addReaction,
  setMechanism,
  setCurrentExample,
  setSelectedMechanism,
} from '../../redux/slices/mechanismSlice'
import {
  resetConditions,
  setDuration,
  setTimeStep,
  setOutputFrequency,
  setConditions,
  setExampleFiles,
  setExampleLoaded,
  setSourceFile,
} from '../../redux/slices/conditionsSlice'
import { resetSimulation } from '../../redux/slices/simulationSlice'
import { buildGeneratedReactionName } from '../../components/Mechanism/reactions/reactionUtils'
import {
  PHASE_PROPERTY_KEYS,
  SPECIES_PROPERTY_KEYS,
  pickDeclared,
} from '../simulation/local/speciesProperties'

// Loads a resolved music-box v1 config into Redux. conditions.data must already hold every
// CSV-derived block inline; callers resolve filepaths before calling this.
export function loadMusicBoxConfig(config, { dispatch, navigate, meta = {}, csv } = {}) {
  dispatch(resetMechanism())
  dispatch(resetConditions())
  dispatch(resetSimulation())

  const mechanismConfig = config?.mechanism || {}

  dispatch(setMechanism(config))

  // Diffusion coefficient and density belong to PhaseSpecies, so collect them by name
  // for placement under phases[].species[].
  const phaseProperties = new Map()
  for (const phase of Array.isArray(mechanismConfig.phases) ? mechanismConfig.phases : []) {
    for (const entry of Array.isArray(phase.species) ? phase.species : []) {
      if (!entry || typeof entry !== 'object' || !entry.name) {
        continue
      }
      const carried = pickDeclared(entry, PHASE_PROPERTY_KEYS)
      if (Object.keys(carried).length > 0) {
        phaseProperties.set(entry.name, { ...phaseProperties.get(entry.name), ...carried })
      }
    }
  }

  const mechanismSpecies = Array.isArray(mechanismConfig.species) ? mechanismConfig.species : []
  mechanismSpecies.forEach((species) => {
    // Only include declared properties; defaults would make unspecified values look configured.
    dispatch(
      addSpecies({
        name: species.name,
        phase: species.phase || 'Gas',
        ...pickDeclared(species, SPECIES_PROPERTY_KEYS),
        ...(phaseProperties.get(species.name) ?? {}),
      })
    )
  })

  const mechanismReactions = Array.isArray(mechanismConfig.reactions)
    ? mechanismConfig.reactions
    : []
  mechanismReactions.forEach((reaction) => {
    // FlowGraph identifies reaction nodes by name, so one is filled in where the mechanism does
    // not declare one. The editor uses buildGeneratedReactionName to tell the two apart.
    const declaredName =
      typeof reaction.name === 'string' && reaction.name.trim().length > 0 ? reaction.name : null

    dispatch(
      addReaction({
        ...reaction,
        id: uuidv4(),
        name: declaredName ?? buildGeneratedReactionName(reaction),
      })
    )
  })

  // parseBoxModelOptions handles every time unit the solver accepts.
  const { chemTimeStep, outputTimeStep, simulationLength } = parseBoxModelOptions(config)
  dispatch(setDuration(simulationLength))
  dispatch(setTimeStep(chemTimeStep))
  dispatch(setOutputFrequency(outputTimeStep))

  if (config?.['__source file'] != null) {
    dispatch(setSourceFile(config['__source file']))
  } else {
    dispatch(setSourceFile(null))
  }

  dispatch(setConditions(config?.conditions))
  dispatch(
    setExampleFiles({
      ...(csv || {}),
      data: config?.conditions?.data || [],
    })
  )
  dispatch(
    setCurrentExample({
      id: meta.id,
      name: meta.name,
      description: meta.description,
      mechanism_name: meta.mechanism_name,
      csv,
    })
  )
  dispatch(setSelectedMechanism(meta.mechanism_name || meta.id || 'custom'))
  dispatch(setExampleLoaded(false))

  navigate('/mechanism')
}
