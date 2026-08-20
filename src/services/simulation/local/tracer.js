// Per-reaction "tracer" species. Injected as a product with no consumption term, so its
// concentration is a running integral of that reaction's rate. Read back by differencing
// its endpoints -- see computeIntegratedReactionRate.
// Keyed by array index, not reaction name: names live in the same namespace as real species
// and would collide (carbon_bond_5 names 31 reactions after the species they consume).

export const TRACER_PREFIX = '__PROD__'

const normalizeReactionName = (name) =>
  typeof name === 'string'
    ? name
        .replace(/\s+/g, '_')
        .replace(/[^A-Za-z0-9_]/g, '')
        .toUpperCase()
    : ''

/**
 * Synthetic species name for the reaction at `index` in the mechanism's reactions array.
 * Unnamed reactions get an index-only key, which is still stable and addressable -- unlike
 * the previous random suffix, which could not be reconstructed when reading results back.
 */
export const buildTracerSpeciesName = (index, reactionName) => {
  const suffix = normalizeReactionName(reactionName)
  return suffix ? `${TRACER_PREFIX}RXN_${index}_${suffix}` : `${TRACER_PREFIX}RXN_${index}`
}

/** Solver output key for a tracer species, e.g. "CONC.__PROD__RXN_165_NO2.mol m-3". */
export const buildTracerConcentrationKey = (index, reactionName) =>
  `CONC.${buildTracerSpeciesName(index, reactionName)}.mol m-3`

/** True for real chemistry; false for the synthetic tracers injected above. */
export const isRealSpeciesName = (name) =>
  typeof name === 'string' && !name.startsWith(TRACER_PREFIX)
