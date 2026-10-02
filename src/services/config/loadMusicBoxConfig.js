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
import { bindRateColumns } from '../conditions/rateColumns'
import { bindConcentrationColumns } from '../conditions/speciesColumns'
import { withSpeciesIds, withSpeciesNames } from '../mechanism/speciesIds'
import { resetSimulation } from '../../redux/slices/simulationSlice'

// MUSICA's parser validates the mechanism, fills in default values, and gives back the canonical
// v1 format. It throws an Error with the parser messages when the mechanism is not valid.
const parseMechanism = async (mechanism) => {
  await initModule()
  return mechanismConfiguration.parseMechanismFromString(JSON.stringify(mechanism))
}

// Converts a music-box config into the shape Redux stores. MUSICA's parser validates the
// mechanism and gives back the canonical v1 format. Redux stores it with UI-only ids on the
// species and the reactions, and with species ids in place of species names (see
// services/mechanism/speciesIds).
export async function toReduxConfig(config) {
  const mechanismConfig = config?.mechanism ? await parseMechanism(config.mechanism) : {}

  // Reactions get a UI-only id for React list keys and updateReaction/removeReaction targeting.
  // No name is generated here for an undeclared reaction -- FlowGraph/ReactionEditor compute a
  // display label on demand (buildGeneratedReactionName) instead of one being persisted, so an
  // undeclared name never leaks into a downloaded config.
  const reactions = (Array.isArray(mechanismConfig.reactions) ? mechanismConfig.reactions : []).map(
    (reaction) => ({ ...reaction, id: uuidv4() })
  )

  return { ...config, mechanism: withSpeciesIds({ ...mechanismConfig, reactions }) }
}

// Loads a music-box config into Redux. conditions.data must already hold every
// CSV-derived block inline; callers resolve filepaths before calling this. Rejects when the
// mechanism is not valid, before any Redux state changes.
//
// Resolves to { ignoredThirdBodySpecies, unmatchedRateParameters, unmatchedConcentrations }.
// None of them is loaded:
//   ignoredThirdBodySpecies - the third-body species whose concentration the config sets. The
//                             solver gets a third-body concentration from the air density.
//   unmatchedRateParameters - the rate-parameter headers that name no reaction of the
//                             mechanism. The solver would ignore them.
//   unmatchedConcentrations - the concentration headers that name no species of the
//                             mechanism.
// The caller tells the user (see notifyLoadedConditionsIssues).
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
  const { table: withoutThirdBodies, dropped } = dropConcentrations(
    tableFromConditionsConfig(config?.conditions),
    thirdBodyNames
  )
  // Rate parameters are stored under their reaction id (see rateColumns), and concentrations
  // under their species id (see speciesColumns). The headers name them, so the match uses the
  // name-based view of the mechanism.
  const { table: withRateIds, unmatched } = bindRateColumns(
    withoutThirdBodies,
    withSpeciesNames(reduxConfig.mechanism)?.reactions || []
  )
  const { table, unmatched: unmatchedConcentrations } = bindConcentrationColumns(
    withRateIds,
    reduxConfig.mechanism?.species || []
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
  return {
    ignoredThirdBodySpecies: dropped,
    unmatchedRateParameters: unmatched,
    unmatchedConcentrations,
  }
}

const MAX_LISTED = 5

// Shows a warning for each kind of condition that loadMusicBoxConfig did not load.
export function notifyLoadedConditionsIssues(
  notify,
  { ignoredThirdBodySpecies, unmatchedRateParameters, unmatchedConcentrations } = {}
) {
  notifyIgnoredThirdBodySpecies(notify, ignoredThirdBodySpecies)
  if (unmatchedConcentrations?.length) {
    const listed = unmatchedConcentrations.slice(0, MAX_LISTED)
    const more = unmatchedConcentrations.length - listed.length
    notify.warning(
      'Concentrations Ignored',
      `${listed.join(', ')}${more > 0 ? ` and ${more} more` : ''} ` +
        `${unmatchedConcentrations.length === 1 ? 'names no species' : 'name no species'} ` +
        'of the mechanism, so the values were not loaded.'
    )
  }
  if (unmatchedRateParameters?.length) {
    const listed = unmatchedRateParameters.slice(0, MAX_LISTED)
    const more = unmatchedRateParameters.length - listed.length
    notify.warning(
      'Rate Parameters Ignored',
      `${listed.join(', ')}${more > 0 ? ` and ${more} more` : ''} ` +
        `${unmatchedRateParameters.length === 1 ? 'names no reaction' : 'name no reactions'} ` +
        'of the mechanism, so the values were not loaded.'
    )
  }
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
