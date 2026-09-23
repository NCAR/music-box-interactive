import { canonicalReactionType } from '../Mechanism/reactions/reactionRegistry'
import {
  buildTracerConcentrationKeys,
  isRealSpeciesName,
} from '../../services/simulation/local/tracer'

export const isRealSpecies = isRealSpeciesName

/**
 * Names of third-body species (M and friends) declared by the mechanism.
 *
 * A third body is "any molecule present in the system" -- it catalyses a reaction without
 * being consumed, so the solver reports no concentration for it. That means it can never
 * appear in `selectedSpecies`, and requiring it would permanently hide every reaction that
 * uses one (in Chapman, that is O + O2 + M -> O3 + M, the ozone-forming step).
 */
export const getThirdBodyNames = (species) =>
  new Set((species ?? []).filter((s) => s?.['is third body']).map((s) => s?.name))

/**
 * A reaction is drawn when a selected species appears among its reactants or products.
 * Third bodies never count toward this.
 */
// Reaction types store species differently: SURFACE uses `gas-phase species` and
// `gas-phase products`, while BRANCHED splits products into `alkoxy products` and
// `nitrate products`. Reading only `reactants`/`products` makes SURFACE reactions
// invisible and BRANCHED reactions appear to consume without producing.
const componentList = (components) =>
  (Array.isArray(components) ? components : [components])
    .filter(Boolean)
    .map((entry) => (typeof entry === 'string' ? { 'species name': entry } : entry))

export const reactionReactants = (reaction) =>
  componentList(reaction?.reactants ?? reaction?.['gas-phase species'] ?? [])

// Both branches of a branched reaction are produced so the diagram shows both.
export const reactionProducts = (reaction) => [
  ...componentList(reaction?.products ?? reaction?.['gas-phase products'] ?? []),
  ...componentList(reaction?.['alkoxy products'] ?? []),
  ...componentList(reaction?.['nitrate products'] ?? []),
]

// The type filter narrows what the species selection already allows. An empty type means all.
export const matchesReactionType = (reaction, reactionType) =>
  !reactionType || canonicalReactionType(reaction?.type) === reactionType

export const isReactionVisible = (reaction, selectedSpecies, thirdBodyNames) => {
  const named = (components) =>
    components
      .map((entry) => entry['species name'])
      .filter((name) => isRealSpecies(name) && !thirdBodyNames.has(name))

  const involved = [
    ...named(reactionReactants(reaction)),
    ...named(reactionProducts(reaction)),
  ]

  return involved.some((name) => selectedSpecies.includes(name))
}


/**
 * Edges one reaction contributes, with stoichiometric coefficients applied.
 *
 * The reaction's integrated rate counts reaction *events*; an edge represents the flow of a
 * *species*, so it carries `coefficient x rate`. In `O + O3 -> 2 O2` the O2 edge is twice
 * the rate, because each event yields two O2.
 *
 * A negative product coefficient means the reaction net-consumes that species -- CB05 uses
 * this for lumped operator species (PAR). Those become consumption edges rather than
 * production edges with a negative magnitude, which would sort below any range minimum and
 * would produce NaN widths under log scaling.
 *
 * Coefficients are aggregated per species per direction, so a species listed more than once
 * on the same side sums rather than overwriting.
 */

// `nodeId` identifies the reaction node the edges attach to. It is passed explicitly because
// reaction names are not unique: distinct reactions can share reactants and products, causing
// name-keyed nodes to merge and report only one rate. Falls back to the name for callers without
// a better identifier.
export const getReactionEdges = (reaction, rate, thirdBodyNames, nodeId = reaction?.name) => {
  const keep = (name) => isRealSpecies(name) && !thirdBodyNames.has(name)
  const consumed = new Map()
  const produced = new Map()
  const add = (map, name, coeff) => map.set(name, (map.get(name) ?? 0) + coeff)

  for (const entry of reactionReactants(reaction)) {
    const name = entry['species name']
    if (keep(name)) add(consumed, name, Math.abs(entry.coefficient ?? 1))
  }
  for (const entry of reactionProducts(reaction)) {
    const name = entry['species name']
    if (!keep(name)) continue
    const coeff = entry.coefficient ?? 1
    if (coeff < 0) add(consumed, name, -coeff)
    else if (coeff > 0) add(produced, name, coeff)
  }

  const edges = []
  for (const [name, coeff] of consumed) {
    edges.push({ source: name, target: nodeId, value: coeff * rate })
  }
  for (const [name, coeff] of produced) {
    edges.push({ source: nodeId, target: name, value: coeff * rate })
  }
  return edges
}

/**
 * Integrated reaction rate for the reaction at `reactionIndex` over [timeStart, timeEnd],
 * in mol m-3 -- i.e. the time integral of that reaction's rate across the window.
 *
 * The tracer species is itself a running integral of the reaction rate (it only ever
 * accumulates, having no consumption term), so the integral over a window is the DIFFERENCE
 * between its endpoints. Summing the tracer across samples instead would re-add the whole
 * accumulated total at every step, producing a number that scales with output resolution
 * rather than with chemistry -- halving the output frequency would halve every value.
 *
 * `reactionIndex` must be the reaction's position in the UNFILTERED mechanism reactions array
 * -- the same array run.js walked when injecting tracers. Passing an index from a filtered
 * subset silently reads a different reaction's tracer.
 */
export function computeIntegratedReactionRate(
  reaction,
  reactionIndex,
  results,
  timeStart,
  timeEnd
) {
  if (!Array.isArray(results)) return 0

  // Sum rates across the reaction's tracer keys. Most reactions have one. Branched reactions
  // have one per branch, with the total rate equal to their sum. Missing keys contribute zero.
  let total = 0
  let matched = false

  for (const concKey of buildTracerConcentrationKeys(reactionIndex, reaction?.name)) {
    let first = null
    let last = null

    for (const timeEntry of results) {
      const t = timeEntry.time
      if (t < timeStart || t > timeEnd) continue
      const value = timeEntry.concentrations?.[concKey]
      if (typeof value !== 'number') continue
      if (first === null) first = value
      last = value
    }

    if (first !== null) {
      matched = true
      total += last - first
    }
  }

  return matched ? total : 0
}

/**
 * Computes a time series of cumulative reaction amounts over a specified time window:
 * - One row per results sample and one column per tracked reaction.
 * - Each reaction starts at 0 at timeStart.
 * - Values at any time are directly comparable to computeIntegratedReactionRate for that same window.
 */
export function computeReactionSeries(trackedReactions, results, timeStart, timeEnd) {
  if (!Array.isArray(results)) return []

  const tracked = trackedReactions.map(({ key, reaction, index }) => ({
    key,
    concKeys: buildTracerConcentrationKeys(index, reaction?.name),
  }))

  const baselines = new Map()
  const points = []

  for (const timeEntry of results) {
    const t = timeEntry.time
    if (t < timeStart || t > timeEnd) continue

    const point = { time: t }
    for (const { key, concKeys } of tracked) {
      let total = 0
      let matched = false
      for (const concKey of concKeys) {
        const value = timeEntry.concentrations?.[concKey]
        if (typeof value !== 'number') continue
        matched = true
        total += value
      }
      if (!matched) continue
      if (!baselines.has(key)) baselines.set(key, total)
      point[key] = total - baselines.get(key)
    }
    points.push(point)
  }

  return points
}

