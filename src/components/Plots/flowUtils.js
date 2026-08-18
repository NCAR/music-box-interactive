export const isRealSpecies = (name) => !name.includes('__')

export function computeGrossProduction(reaction, results, timeStart, timeEnd) {
  if (!Array.isArray(results)) return 0

  const prodName = reaction.name
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_]/g, '')
    .toUpperCase()
  const concKey = `CONC.${prodName}.mol m-3`

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
