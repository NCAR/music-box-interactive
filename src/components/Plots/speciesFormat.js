// Strip the "CONC." prefix and ".mol m-3" unit suffix, leaving the species name
export function getSpeciesDisplayName(species) {
  return species.replace(/^CONC\./, '').replace(/\.mol m-3$/, '')
}
