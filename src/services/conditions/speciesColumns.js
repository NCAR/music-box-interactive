import { columnValues, headerKey } from './table'

// A species concentration belongs to a species, so the conditions table stores its column
// under the species id, not under its name: CONC#<speciesId>. A rename then keeps the values.
// The CONC.<name>.mol m-3 header is made only where a header is needed: the solver payload and
// the conditions download. The key has no ".", so headerKey() gives the key back unchanged.

const KEY_PATTERN = /^CONC#(.+)$/

export const concentrationColumnKey = (speciesId) => `CONC#${speciesId}`

// The species id of a concentration column key, or null.
export function parseConcentrationColumnKey(key) {
  const match = KEY_PATTERN.exec(String(key))
  return match ? match[1] : null
}

// The music-box header of a species concentration. Concentrations are stored in mol m-3.
export const concentrationHeader = (name) => `CONC.${name}.mol m-3`

// Whether a header is a music-box concentration header (CONC.<name>, with or without a unit).
export const isConcentrationHeader = (header) => String(header).startsWith('CONC.')

// Whether a column is a species concentration, by id key or by header.
export const isConcentrationColumn = (key) =>
  parseConcentrationColumnKey(key) !== null || isConcentrationHeader(key)

// The species name in a concentration header, e.g. "O3" for "CONC.O3.mol m-3".
export const speciesNameOfHeader = (header) => headerKey(header).slice('CONC.'.length)

// Moves the concentration header columns of a table to their species-id keys. Returns
// { table, unmatched }, where `unmatched` lists the headers that name no species of the
// mechanism. Those columns are left out: the solver would reject them.
export function bindConcentrationColumns(table, species = []) {
  const ids = new Map(species.filter((s) => s?.id).map((s) => [s.name, s.id]))
  const columns = {}
  const unmatched = []

  Object.keys(table.columns).forEach((header) => {
    if (!isConcentrationHeader(header)) {
      columns[header] = table.columns[header]
      return
    }
    const id = ids.get(speciesNameOfHeader(header))
    if (id) columns[concentrationColumnKey(id)] = columnValues(table, header)
    else unmatched.push(header)
  })

  return { table: { times: table.times, columns }, unmatched }
}

// The table without the concentration column of a species.
export function dropSpeciesColumn(table, speciesId) {
  const key = concentrationColumnKey(speciesId)
  if (!(key in table.columns)) return table
  const { [key]: _removed, ...columns } = table.columns
  return { times: table.times, columns }
}
