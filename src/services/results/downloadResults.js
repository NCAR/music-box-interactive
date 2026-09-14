import { computeIntegratedReactionRate } from '../../components/Plots/flowUtils'
import { downloadJson } from '../../utils/downloadJson'

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

// Every concentration/environment column the solver produced, plus each reaction's
// integrated rate per output interval -- identified against the mechanism's own reaction
// list via a "RXN_<index>" key, since reaction names are not unique (see flowUtils.js).
// `reactions` must be the same array run.js injected tracers into (state.mechanism.reactions),
// so its indices match the ones computeIntegratedReactionRate expects.
export function buildResultsExport({ mechanism, results, excludedResults, metadata }) {
  const reactions = Array.isArray(mechanism?.reactions) ? mechanism.reactions : []
  const points = Array.isArray(results) ? results : []
  const tracerPoints = Array.isArray(excludedResults) ? excludedResults : []

  const timeSeries = { 'time.s': points.map((point) => point.time) }
  const columnKeys = new Set()
  points.forEach((point) => {
    Object.keys(point.concentrations || {}).forEach((key) => columnKeys.add(key))
  })
  for (const key of columnKeys) {
    timeSeries[key] = points.map((point) => point.concentrations?.[key] ?? null)
  }

  const integratedReactionRates = { 'interval_start.s': [] }
  reactions.forEach((_, index) => {
    integratedReactionRates[`RXN_${index}`] = []
  })
  for (let i = 0; i < points.length - 1; i++) {
    const timeStart = points[i].time
    const timeEnd = points[i + 1].time
    integratedReactionRates['interval_start.s'].push(timeStart)
    reactions.forEach((reaction, index) => {
      integratedReactionRates[`RXN_${index}`].push(
        computeIntegratedReactionRate(reaction, index, tracerPoints, timeStart, timeEnd)
      )
    })
  }

  const reactionLegend = reactions.map((reaction, index) => ({
    key: `RXN_${index}`,
    id: reaction?.id ?? null,
    name: reaction?.name ?? null,
    type: reaction?.type ?? null,
    formula: formatReactionFormula(reaction),
  }))

  return {
    metadata: {
      mechanism: metadata?.mechanism || mechanism?.selectedMechanism || 'custom',
      duration: metadata?.duration ?? null,
      generatedAt: new Date().toISOString(),
    },
    time_series: timeSeries,
    integrated_reaction_rates: integratedReactionRates,
    reactions: reactionLegend,
  }
}

export function downloadSimulationResults(args) {
  const data = buildResultsExport(args)
  downloadJson(data, `musicbox-results-${data.metadata.mechanism}-${Date.now()}.json`)
}
