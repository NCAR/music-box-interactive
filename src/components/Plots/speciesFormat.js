// Strip the "CONC." prefix and ".mol m-3" unit suffix, leaving the species name
export function getSpeciesDisplayName(species) {
  return species.replace(/^CONC\./, '').replace(/\.mol m-3$/, '')
}

// Species names present in a simulation results array, derived from the first time point's
// concentration keys. Falls back to the point's own keys (minus known non-species fields) for
// result shapes that don't nest concentrations under their own key.
export function getResultSpeciesNames(results) {
  if (!Array.isArray(results) || results.length === 0) return []
  const firstPoint = results[0]
  const keys =
    firstPoint?.concentrations && typeof firstPoint.concentrations === 'object'
      ? Object.keys(firstPoint.concentrations)
      : Object.keys(firstPoint).filter(
          (key) => key !== 'time' && key !== 'timestamp' && key !== 'date' && key !== 'concentrations'
        )
  return keys.map(getSpeciesDisplayName)
}
