import {
  buildTracerConcentrationKey,
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
 * A reaction is drawn when every reactant the user *could* have selected is selected.
 * Third bodies are excluded from that requirement: they are ambient, not chosen.
 */
export const isReactionVisible = (reaction, selectedSpecies, thirdBodyNames) => {
  const required = (reaction?.reactants ?? [])
    .map((r) => r['species name'])
    .filter((name) => isRealSpecies(name) && !thirdBodyNames.has(name))
  return required.length > 0 && required.every((sp) => selectedSpecies.includes(sp))
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

  const concKey = buildTracerConcentrationKey(reactionIndex, reaction?.name)

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

  if (first === null) return 0
  return last - first
}
