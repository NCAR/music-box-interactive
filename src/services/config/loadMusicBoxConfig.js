import { v4 as uuidv4 } from 'uuid'
import { initModule, mechanismConfiguration, parseBoxModelOptions } from '@ncar/music-box'
import {
  resetMechanism,
  setConfig,
  setCurrentExample,
  setSelectedMechanism,
} from '../../redux/slices/mechanismSlice'
import {
  resetConditions,
  setDuration,
  setTimeStep,
  setOutputFrequency,
  setConditions,
  setExampleLoaded,
  setSourceFile,
} from '../../redux/slices/conditionsSlice'
import { resetSimulation } from '../../redux/slices/simulationSlice'
import { PHASE_PROPERTY_KEYS, pickDeclared } from '../simulation/local/speciesProperties'

// MUSICA's parser validates the mechanism, fills in default values, and gives back the canonical
// v1 format. It throws an Error with the parser messages when the mechanism is not valid.
const parseMechanism = async (mechanism) => {
  await initModule()
  return mechanismConfiguration.parseMechanismFromString(JSON.stringify(mechanism))
}

// Converts a music-box config into the shape Redux stores. MUSICA's parser validates the
// mechanism and gives back the canonical v1 format. Species then carry their phase and
// phase-only properties.
export async function toReduxConfig(config) {
  const mechanismConfig = config?.mechanism ? await parseMechanism(config.mechanism) : {}

  // Diffusion coefficient and density belong to PhaseSpecies, so collect them by name and merge
  // them onto the matching species entry -- the editor shows them on the species editor, different from the configuration format
  // these are mapped to the proper location when we serialize the config
  //
  // in music box interactive's data format, the phase is stored on the species
  // whereas in the configuraiton, phase membership is a list of species on the phase
  const phases = Array.isArray(mechanismConfig.phases) ? mechanismConfig.phases : []
  const phaseProperties = new Map()
  const phaseNameBySpecies = new Map()
  for (const phase of phases) {
    for (const entry of Array.isArray(phase.species) ? phase.species : []) {
      const entryName = typeof entry === 'string' ? entry : entry?.name
      if (!entryName) {
        continue
      }
      if (!phaseNameBySpecies.has(entryName)) {
        phaseNameBySpecies.set(entryName, phase.name)
      }
      if (typeof entry !== 'object') {
        continue
      }
      const carried = pickDeclared(entry, PHASE_PROPERTY_KEYS)
      if (Object.keys(carried).length > 0) {
        phaseProperties.set(entryName, { ...phaseProperties.get(entryName), ...carried })
      }
    }
  }

  const species = (Array.isArray(mechanismConfig.species) ? mechanismConfig.species : []).map(
    (sp) => ({
      phase: phaseNameBySpecies.get(sp.name) ?? 'gas',
      ...sp,
      ...(phaseProperties.get(sp.name) ?? {}),
    })
  )

  // Reactions get a UI-only id for React list keys and updateReaction/removeReaction targeting.
  // No name is generated here for an undeclared reaction -- FlowGraph/ReactionEditor compute a
  // display label on demand (buildGeneratedReactionName) instead of one being persisted, so an
  // undeclared name never leaks into a downloaded config.
  const reactions = (Array.isArray(mechanismConfig.reactions) ? mechanismConfig.reactions : []).map(
    (reaction) => ({ ...reaction, id: uuidv4() })
  )

  return { ...config, mechanism: { ...mechanismConfig, species, reactions } }
}

// Loads a music-box config into Redux. conditions.data must already hold every
// CSV-derived block inline; callers resolve filepaths before calling this. Rejects when the
// mechanism is not valid, before any Redux state changes.
export async function loadMusicBoxConfig(config, { dispatch, navigate, meta = {} } = {}) {
  const reduxConfig = await toReduxConfig(config)

  dispatch(resetMechanism())
  dispatch(resetConditions())
  dispatch(resetSimulation())

  dispatch(setConfig(reduxConfig))

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
    setCurrentExample({
      id: meta.id,
      name: meta.name,
      description: meta.description,
      mechanism_name: meta.mechanism_name,
    })
  )
  dispatch(setSelectedMechanism(meta.mechanism_name || meta.id || 'custom'))
  dispatch(setExampleLoaded(false))

  navigate('/mechanism')
}
