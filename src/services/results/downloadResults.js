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
      const name = component?.['species name'] || component?.name || ''
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

// Builds the three files a results download bundles into a zip:
// - results.csv: every concentration/environment column, plus each reaction's rate integrated
//   over the interval starting at that row -- so the last row leaves rate columns blank, since
//   there is no interval after it.
// - music_box_config.json: the same config Download Config produces, so results and the
//   configuration that produced them travel together.
// - mapping.json: RXN_<index> -> the reaction it refers to, since reaction names are not
//   unique (see flowUtils.js) and the CSV can only carry the index-based key.
// `reactions` must be the same array run.js injected tracers into (state.mechanism.reactions),
// so its indices match the ones computeIntegratedReactionRate expects.
export function buildResultsExport({ mechanism, conditions, results, excludedResults, metadata }) {
  const reactions = Array.isArray(mechanism?.reactions) ? mechanism.reactions : []
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
