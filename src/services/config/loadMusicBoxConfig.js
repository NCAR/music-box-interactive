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
  setConditionsTable,
} from '../../redux/slices/conditionsSlice'
import { dropConcentrations, tableFromConditionsConfig } from '../conditions/table'
import { isThirdBody } from '../simulation/local/speciesProperties'
import { resetSimulation } from '../../redux/slices/simulationSlice'

// MUSICA's parser validates the mechanism, fills in default values, and gives back the canonical
// v1 format. It throws an Error with the parser messages when the mechanism is not valid.
const parseMechanism = async (mechanism) => {
  await initModule()
  return mechanismConfiguration.parseMechanismFromString(JSON.stringify(mechanism))
}

// Converts a music-box config into the shape Redux stores. MUSICA's parser validates the
// mechanism and gives back the canonical v1 format, which Redux stores as it is.
export async function toReduxConfig(config) {
  const mechanismConfig = config?.mechanism ? await parseMechanism(config.mechanism) : {}

  // Reactions get a UI-only id for React list keys and updateReaction/removeReaction targeting.
  // No name is generated here for an undeclared reaction -- FlowGraph/ReactionEditor compute a
  // display label on demand (buildGeneratedReactionName) instead of one being persisted, so an
  // undeclared name never leaks into a downloaded config.
  const reactions = (Array.isArray(mechanismConfig.reactions) ? mechanismConfig.reactions : []).map(
    (reaction) => ({ ...reaction, id: uuidv4() })
  )

  return { ...config, mechanism: { ...mechanismConfig, reactions } }
}

// Loads a music-box config into Redux. conditions.data must already hold every
// CSV-derived block inline; callers resolve filepaths before calling this. Rejects when the
// mechanism is not valid, before any Redux state changes.
//
// Resolves to { ignoredThirdBodySpecies }: the third-body species whose concentration the
// config sets. The solver gets a third-body concentration from the air density, so those
// values are not loaded. The caller tells the user (see notifyIgnoredThirdBodySpecies).
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

  // The conditions go into the table once, here. Nothing converts them again later.
  const thirdBodyNames = (reduxConfig.mechanism?.species || [])
    .filter(isThirdBody)
    .map((s) => s.name)
  const { table, dropped } = dropConcentrations(
    tableFromConditionsConfig(config?.conditions),
    thirdBodyNames
  )
  dispatch(setConditionsTable(table))
  dispatch(
    setCurrentExample({
      id: meta.id,
      name: meta.name,
      description: meta.description,
      mechanism_name: meta.mechanism_name,
    })
  )
  dispatch(setSelectedMechanism(meta.mechanism_name || meta.id || 'custom'))

  navigate('/mechanism')
  return { ignoredThirdBodySpecies: dropped }
}

// Shows the warning for the third-body concentrations that loadMusicBoxConfig ignored.
export function notifyIgnoredThirdBodySpecies(notify, species) {
  if (!species?.length) return
  notify.warning(
    'Third-Body Concentrations Ignored',
    `The configuration sets a concentration for ${species.join(', ')}. ` +
      `${species.length === 1 ? 'This is a third-body species' : 'These are third-body species'}: ` +
      'the solver gets the concentration from the air density, so the value was not loaded.'
  )
}
