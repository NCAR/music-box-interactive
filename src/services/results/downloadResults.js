import { zipSync, strToU8 } from 'fflate'
import { computeIntegratedReactionRate } from '../../components/Plots/flowUtils'
import { getReactionReactants } from '../simulation/local/mechanism'
import { buildDownloadableConfig } from '../config/downloadConfig'
import { toCsv } from '../../utils/csv'
import { downloadBlob } from '../../utils/downloadJson'
import { withSpeciesNames } from '../mechanism/speciesIds'

function formatComponents(components) {
  if (!Array.isArray(components) || components.length === 0) {
    return '∅'
  }
  return components
    .map((component) => {
      const name = component?.name || ''
      const coefficient = Number(component?.coefficient)
      const prefix = Number.isFinite(coefficient) && coefficient !== 1 ? `${coefficient} ` : ''
      return `${prefix}${name}`
    })
    .join(' + ')
}

function formatReactionFormula(reaction) {
  const reactants = getReactionReactants(reaction)
  const products =
    reaction?.products || reaction?.['gas-phase products'] || reaction?.['alkoxy products'] || []
  const reactantList = Array.isArray(reactants) ? reactants : [reactants]
  const productList = Array.isArray(products) ? products : [products]
  return `${formatComponents(reactantList)} → ${formatComponents(productList)}`
}

// Builds the zip's three files:
// - results.csv: concentration/env columns, plus each reaction's integrated rate (the flux
//   that the reaction rate graphs and the flow diagram show) over the interval starting at
//   that row, in an IRR.<id>.mol m-3 column (last row is blank -- no interval after it).
// - music_box_config.json: same as Download Config.
// - mapping.json: <id> -> reaction, since names aren't unique. The id is the reaction's
//   UI-only id; it is valid only for this download, because a load gives new ids.
// `reactions` here is mechanism.config.mechanism.reactions -- the single source list
// buildLocalSimulationPayload also serializes from, in the same order, so the config reaction
// at the same index is the same reaction (run.js's tracer injection only appends to product
// arrays, it never changes reaction order or count).
export function buildResultsExport({ mechanism, conditions, results, excludedResults, metadata }) {
  // With species names for the formulas; the reactions keep their ids.
  const reactions = withSpeciesNames(mechanism?.config?.mechanism ?? {})?.reactions ?? []
  const points = Array.isArray(results) ? results : []
  const tracerPoints = Array.isArray(excludedResults) ? excludedResults : []

  const concentrationKeys = []
  const seenKeys = new Set()
  points.forEach((point) => {
    Object.keys(point.concentrations || {}).forEach((key) => {
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        concentrationKeys.push(key)
      }
    })
  })
  // A reaction without an id (only hand-built data) falls back to RXN_<index>.
  const reactionIds = reactions.map((reaction, index) => reaction?.id ?? `RXN_${index}`)
  const rateKeys = reactionIds.map((id) => `IRR.${id}.mol m-3`)

  const headers = ['time.s', ...concentrationKeys, ...rateKeys]
  const rows = points.map((point, index) => {
    const row = [point.time, ...concentrationKeys.map((key) => point.concentrations?.[key] ?? '')]
    if (index < points.length - 1) {
      const timeEnd = points[index + 1].time
      reactions.forEach((reaction, rxnIndex) => {
        row.push(
          computeIntegratedReactionRate(reaction, rxnIndex, tracerPoints, point.time, timeEnd)
        )
      })
    } else {
      rateKeys.forEach(() => row.push(''))
    }
    return row
  })

  // The name is the one in music_box_config.json, so the mapping and the config agree. For an
  // unnamed rate-parameter reaction that is its generated name (see rateReactionNames).
  const config = buildDownloadableConfig({ mechanism, conditions })
  const configReactions = config?.mechanism?.reactions ?? []
  const mapping = {}
  reactions.forEach((reaction, index) => {
    mapping[reactionIds[index]] = {
      name: configReactions[index]?.name || reaction?.name || null,
      type: reaction?.type ?? null,
      formula: formatReactionFormula(reaction),
    }
  })

  return {
    resultsCsv: toCsv(headers, rows),
    config,
    mapping,
    mechanismName: metadata?.mechanism || mechanism?.selectedMechanism || 'custom',
  }
}

export function downloadSimulationResults(args) {
  const { resultsCsv, config, mapping, mechanismName } = buildResultsExport(args)
  const zipped = zipSync({
    'results.csv': strToU8(resultsCsv),
    'music_box_config.json': strToU8(JSON.stringify(config, null, 2)),
    'mapping.json': strToU8(JSON.stringify(mapping, null, 2)),
  })
  downloadBlob(
    new Blob([zipped], { type: 'application/zip' }),
    `musicbox-results-${mechanismName}-${Date.now()}.zip`
  )
}
