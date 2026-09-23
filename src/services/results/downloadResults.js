import { zipSync, strToU8 } from 'fflate'
import { computeIntegratedReactionRate } from '../../components/Plots/flowUtils'
import { buildDownloadableConfig } from '../config/downloadConfig'
import { toCsv } from '../../utils/csv'
import { downloadBlob } from '../../utils/downloadJson'

function formatComponents(components) {
  if (!Array.isArray(components) || components.length === 0) {
    return '∅'
  }
  return components
    .map((component) => {
      if (typeof component === 'string') return component
      const name = component?.name || ''
      const coefficient = Number(component?.coefficient)
      const prefix = Number.isFinite(coefficient) && coefficient !== 1 ? `${coefficient} ` : ''
      return `${prefix}${name}`
    })
    .join(' + ')
}

function formatReactionFormula(reaction) {
  const reactants = reaction?.reactants || reaction?.['gas-phase species'] || []
  const products =
    reaction?.products || reaction?.['gas-phase products'] || reaction?.['alkoxy products'] || []
  const reactantList = Array.isArray(reactants) ? reactants : [reactants]
  const productList = Array.isArray(products) ? products : [products]
  return `${formatComponents(reactantList)} → ${formatComponents(productList)}`
}

// Builds the zip's three files:
// - results.csv: concentration/env columns, plus each reaction's rate over the interval
//   starting at that row (last row is blank -- no interval after it).
// - music_box_config.json: same as Download Config.
// - mapping.json: RXN_<index> -> reaction, since names aren't unique.
// `reactions` here is mechanism.config.mechanism.reactions -- the single source list
// buildLocalSimulationPayload also serializes from, in the same order, so RXN_<index> lines up
// with the reaction run.js solved (run.js's tracer injection only appends to product arrays,
// it never changes reaction order or count).
export function buildResultsExport({ mechanism, conditions, results, excludedResults, metadata }) {
  const reactions = Array.isArray(mechanism?.config?.mechanism?.reactions)
    ? mechanism.config.mechanism.reactions
    : []
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
  const rateKeys = reactions.map((_, index) => `RXN_${index}`)

  const headers = ['time.s', ...concentrationKeys, ...rateKeys]
  const rows = points.map((point, index) => {
    const row = [point.time, ...concentrationKeys.map((key) => point.concentrations?.[key] ?? '')]
    if (index < points.length - 1) {
      const timeEnd = points[index + 1].time
      reactions.forEach((reaction, rxnIndex) => {
        row.push(computeIntegratedReactionRate(reaction, rxnIndex, tracerPoints, point.time, timeEnd))
      })
    } else {
      rateKeys.forEach(() => row.push(''))
    }
    return row
  })

  const mapping = {}
  reactions.forEach((reaction, index) => {
    mapping[`RXN_${index}`] = {
      id: reaction?.id ?? null,
      name: reaction?.name ?? null,
      type: reaction?.type ?? null,
      formula: formatReactionFormula(reaction),
    }
  })

  return {
    resultsCsv: toCsv(headers, rows),
    config: buildDownloadableConfig({ mechanism, conditions }),
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
