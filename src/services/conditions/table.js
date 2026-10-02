import { parseConditions } from '@ncar/music-box'

// The conditions are one table: a sorted list of times, and one column of values for each
// condition header (ENV.temperature.K, CONC.O3.mol m-3, PHOTO.O2_1.s-1, ...). A null cell is
// unset. The solver holds the last set temperature, pressure, air density and rate parameter
// until a later time sets a new value. A concentration applies only at its own time.
//
//   { times: number[], columns: { [header]: (number | null)[] } }
//
// Every column has one value for each time. All functions here are pure.

export const TIME_HEADER = 'time.s'
export const TEMPERATURE_HEADER = 'ENV.temperature.K'
export const PRESSURE_HEADER = 'ENV.pressure.Pa'
export const DENSITY_HEADER = 'ENV.air number density.mol m-3'

// The solver uses these values when no time sets a temperature or a pressure.
export const DEFAULT_TEMPERATURE = 298.15
export const DEFAULT_PRESSURE = 101325

export const emptyTable = () => ({ times: [], columns: {} })

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

// The header without its trailing unit segment, so that "CONC.O3" and "CONC.O3.mol m-3" are
// the same column. SURF headers keep their property segment.
export function headerKey(header) {
  const parts = String(header).split('.')
  const prefix = parts[0]
  if (prefix === 'ENV') return parts.length > 2 ? parts.slice(0, -1).join('.') : header
  if (prefix === 'SURF') return parts.length > 3 ? parts.slice(0, -1).join('.') : header
  return parts.slice(0, 2).join('.')
}

// The unit segment of a header, or '' when the header has none.
export function headerUnit(header) {
  const key = headerKey(header)
  return header.length > key.length ? header.slice(key.length + 1) : ''
}

// The header in the table with the same key as `keyOrHeader`, or undefined.
export function findHeader(table, keyOrHeader) {
  const key = headerKey(keyOrHeader)
  return Object.keys(table?.columns || {}).find((header) => headerKey(header) === key)
}

// The values of a column, one for each time. A missing column is all null.
export function columnValues(table, header) {
  const values = table?.columns?.[header]
  return (table?.times || []).map((_, index) =>
    isFiniteNumber(values?.[index]) ? values[index] : null
  )
}

// The table with one cell changed. The column is created when it does not exist.
export function setCell(table, header, index, value) {
  const values = columnValues(table, header)
  values[index] = isFiniteNumber(value) ? value : null
  return { ...table, columns: { ...table.columns, [header]: values } }
}

// Builds a table from rows of { [header]: value }. Rows at the same time merge: a set value
// overwrites, an unset value does not. Headers with the same key share the first header.
export function tableFromRows(rows) {
  const headerForKey = new Map()
  const byTime = new Map()

  rows.forEach((row) => {
    const time = row?.[TIME_HEADER]
    if (!isFiniteNumber(time)) return
    if (!byTime.has(time)) byTime.set(time, {})
    const merged = byTime.get(time)

    Object.entries(row).forEach(([rawHeader, value]) => {
      if (rawHeader === TIME_HEADER) return
      const key = headerKey(rawHeader)
      if (!headerForKey.has(key)) headerForKey.set(key, rawHeader)
      const header = headerForKey.get(key)
      if (isFiniteNumber(value)) merged[header] = value
      else if (!(header in merged)) merged[header] = null
    })
  })

  const times = [...byTime.keys()].sort((a, b) => a - b)
  const columns = Object.fromEntries(
    [...headerForKey.values()].map((header) => [
      header,
      times.map((time) => byTime.get(time)[header] ?? null),
    ])
  )
  return { times, columns }
}

// Builds a table from a v1 config's conditions ({ data: [{ headers, rows }] }). The table
// holds exactly what the blocks hold: no time-0 row is added and no cell is filled in.
export function tableFromConditionsConfig(conditions) {
  return tableFromRows(parseConditions({ data: conditions?.data || [] }))
}

// Adds an empty row at `time`. Returns { table, index }, or null when the time exists.
export function insertTimeRow(table, time) {
  if (table.times.includes(time)) return null
  const times = [...table.times, time].sort((a, b) => a - b)
  const index = times.indexOf(time)
  const columns = Object.fromEntries(
    Object.keys(table.columns).map((header) => {
      const values = columnValues(table, header)
      values.splice(index, 0, null)
      return [header, values]
    })
  )
  return { table: { times, columns }, index }
}

// Makes sure that a t=0 row exists with a temperature and a pressure, so the starting point
// is visible in the table. Existing values do not change.
export function ensureZeroTimeRow(
  table,
  { temperature = DEFAULT_TEMPERATURE, pressure = DEFAULT_PRESSURE } = {}
) {
  let next = table
  let index = next.times.indexOf(0)
  if (index === -1) {
    ;({ table: next, index } = insertTimeRow(next, 0))
  }
  if (columnValues(next, TEMPERATURE_HEADER)[index] === null) {
    next = setCell(next, TEMPERATURE_HEADER, index, temperature)
  }
  if (columnValues(next, PRESSURE_HEADER)[index] === null) {
    next = setCell(next, PRESSURE_HEADER, index, pressure)
  }
  return next
}

// Removes the rows at `indices`. Returns { table, removedTimes, removedCount }, or null when
// there is nothing to remove.
export function removeTimeRows(table, indices) {
  const remove = new Set(indices)
  if (remove.size === 0) return null
  const keep = (_, index) => !remove.has(index)
  return {
    removedCount: remove.size,
    removedTimes: table.times.filter((_, index) => remove.has(index)),
    table: {
      times: table.times.filter(keep),
      columns: Object.fromEntries(
        Object.keys(table.columns).map((header) => [
          header,
          columnValues(table, header).filter(keep),
        ])
      ),
    },
  }
}

// Changes the time of one row. The row's values move with it, and the rows stay sorted.
// Returns null when the time does not change or another row has that time.
export function renameTime(table, index, newTime) {
  if (table.times[index] === newTime) return null
  if (table.times.some((time, i) => i !== index && time === newTime)) return null

  const headers = Object.keys(table.columns)
  const values = Object.fromEntries(headers.map((header) => [header, columnValues(table, header)]))
  const order = table.times
    .map((time, i) => ({ time: i === index ? newTime : time, i }))
    .sort((a, b) => a.time - b.time)

  return {
    oldTime: table.times[index],
    newTime,
    table: {
      times: order.map((row) => row.time),
      columns: Object.fromEntries(
        headers.map((header) => [header, order.map((row) => values[header][row.i])])
      ),
    },
  }
}

// The parse, validate and rename steps behind every time-cell edit in the Conditions tabs.
// Returns a tagged result:
//   { kind: 'invalid' }             -- not a valid number of 0 or more
//   { kind: 'unchanged' }           -- the same as the current value
//   { kind: 'duplicate', newTime }  -- another row has this time
//   { kind: 'ok', result }          -- result is the return value of renameTime
export function commitTime(table, index, rawValue) {
  const trimmed = rawValue.trim()
  const newTime = parseFloat(trimmed)

  if (trimmed === '' || isNaN(newTime) || newTime < 0) return { kind: 'invalid' }
  if (newTime === table.times[index]) return { kind: 'unchanged' }
  if (table.times.some((time, i) => i !== index && time === newTime)) {
    return { kind: 'duplicate', newTime }
  }

  const result = renameTime(table, index, newTime)
  return result ? { kind: 'ok', result } : { kind: 'unchanged' }
}

// Whether the row at `index` sets a species concentration. The Environment tab uses this to
// warn that a changed air density changes how those concentrations read in ppm, ppb, ...
export function rowHasConcentrations(table, index) {
  return Object.entries(table?.columns || {}).some(
    // CONC#<speciesId> in the app, CONC.<name> in a config (see speciesColumns).
    ([header, values]) =>
      (header.startsWith('CONC.') || header.startsWith('CONC#')) && isFiniteNumber(values?.[index])
  )
}

// Whether any of the columns (value arrays, or undefined for a missing column) has a value in
// the row at `index`. The "Hide unset rows" filter of the Conditions tabs uses this.
export function rowHasValues(columns, index) {
  return columns.some((values) => isFiniteNumber(values?.[index]))
}

// The table without the concentration columns of `speciesNames`. A row that only had values in
// those columns is removed too. Returns { table, dropped }, where `dropped` lists the species
// that had a value.
export function dropConcentrations(table, speciesNames) {
  const names = new Set(speciesNames)
  const isDropped = (header) => header.startsWith('CONC.') && names.has(header.split('.')[1])
  const droppedHeaders = Object.keys(table.columns).filter(isDropped)
  if (droppedHeaders.length === 0) return { table, dropped: [] }

  const kept = Object.keys(table.columns).filter((header) => !isDropped(header))
  const keptValues = kept.map((header) => columnValues(table, header))
  const droppedValues = droppedHeaders.map((header) => columnValues(table, header))
  const emptiedRows = table.times
    .map((_, index) => index)
    .filter((index) => rowHasValues(droppedValues, index) && !rowHasValues(keptValues, index))

  const keptTable = {
    times: table.times,
    columns: Object.fromEntries(kept.map((header, i) => [header, keptValues[i]])),
  }
  return {
    table: removeTimeRows(keptTable, emptiedRows)?.table ?? keptTable,
    dropped: droppedHeaders
      .filter((_, i) => droppedValues[i].some((value) => value !== null))
      .map((header) => header.split('.')[1]),
  }
}
