import {
  buildTracerConcentrationKey,
  isRealSpeciesName,
} from '../../services/simulation/local/tracer'

export const isRealSpecies = isRealSpeciesName

/**
 * Cumulative production of the reaction at `reactionIndex`, summed over [timeStart, timeEnd].
 *
 * `reactionIndex` must be the reaction's position in the UNFILTERED mechanism reactions array
 * -- the same array run.js walked when injecting tracers. Passing an index from a filtered
 * subset silently reads a different reaction's tracer.
 */
export function computeGrossProduction(reaction, reactionIndex, results, timeStart, timeEnd) {
  if (!Array.isArray(results)) return 0

  const concKey = buildTracerConcentrationKey(reactionIndex, reaction?.name)

  let total = 0
  for (const timeEntry of results) {
    const t = timeEntry.time
    if (t < timeStart || t > timeEnd) continue
    const concentrations = timeEntry.concentrations
    if (!concentrations) continue
    if (concKey in concentrations) {
      total += concentrations[concKey] ?? 0
    }
  }
  return total
}
