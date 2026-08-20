import {
  buildTracerConcentrationKey,
  isRealSpeciesName,
} from '../../services/simulation/local/tracer'

export const isRealSpecies = isRealSpeciesName

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
