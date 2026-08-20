// Per-reaction "tracer" species.
//
// The MICM solver only reports concentrations, never reaction rates over time, so there is
// no way to ask it how much a given reaction produced. The workaround is to append one
// synthetic species to each reaction's products and never list it as anyone's reactant:
// having only a production term, its concentration can only accumulate, making it an
// odometer for that single reaction. The flow diagram reads it back as cumulative
// production, and run.js strips these keys out of the results before anything else sees them.
//
// The key is derived from the reaction's ARRAY INDEX, not its name. Species names come from
// the mechanism config, so a name-derived tracer shares a namespace with real chemistry --
// in carbon_bond_5, 31 of 39 named reactions are named after the species they consume (the
// ALD2 photolysis reaction is literally named "ALD2"), so the tracer collided with the real
// species: its concentration was stripped from the results as if it were synthetic, and the
// tracer was injected as a genuine product of a reaction that consumes it, inflating ALD2 by
// ~2.3x over a 3-hour run. Indices live in a namespace the config cannot reach.
//
// The normalized reaction name is appended purely as a debugging aid and a staleness guard.
// Editing the mechanism does not clear prior results, so stale excludedResults can be read
// against a re-indexed reactions array; including the name means a shifted index fails to
// match and production reads 0, rather than silently reporting another reaction's numbers.

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
