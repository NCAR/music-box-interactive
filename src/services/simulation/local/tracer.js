// Per-reaction "tracer" species. Injected as a product with no consumption term, so its
// concentration is a running integral of that reaction's rate. Read back by differencing
// its endpoints -- see computeIntegratedReactionRate.
// Keyed by the reaction id, not the reaction name: names live in the same namespace as real
// species and would collide (carbon_bond_5 names 31 reactions after the species they consume),
// and a name can change (a rename, or the generated name of an unnamed reaction). The id is
// the UI-only uuid that every reaction in Redux has.

export const TRACER_PREFIX = '__PROD__'

// A uuid has "-", which is not safe in a species name.
const safeId = (id) => String(id).replace(/[^A-Za-z0-9_]/g, '_')

/**
 * Synthetic species name for a reaction, e.g. "__PROD__RXN_1b9d6bcd_bbfd_4b2d_...". A reaction
 * without an id (only hand-built data) falls back to its index in the mechanism's reactions.
 */
export const buildTracerSpeciesName = (reaction, index) =>
  reaction?.id != null
    ? `${TRACER_PREFIX}RXN_${safeId(reaction.id)}`
    : `${TRACER_PREFIX}RXN_${index}`

/** Solver output key for a tracer species, e.g. "CONC.__PROD__RXN_<id>.mol m-3". */
export const buildTracerConcentrationKey = (reaction, index) =>
  `CONC.${buildTracerSpeciesName(reaction, index)}.mol m-3`

/** True for real chemistry; false for the synthetic tracers injected above. */
export const isRealSpeciesName = (name) =>
  typeof name === 'string' && !name.startsWith(TRACER_PREFIX)

export const BRANCH_TRACER_SUFFIXES = ['_A', '_B']

// All tracer keys a reaction may have: the base key plus one for each branch.
export const buildTracerConcentrationKeys = (reaction, index) => {
  const base = buildTracerSpeciesName(reaction, index)
  return [base, ...BRANCH_TRACER_SUFFIXES.map((suffix) => `${base}${suffix}`)].map(
    (name) => `CONC.${name}.mol m-3`
  )
}
