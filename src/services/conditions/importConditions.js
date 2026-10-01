import { unzipSync } from 'fflate'
import { parseCsv } from '../../utils/csv'
import { isAcceptedUnit } from './conditionItems'
import { TIME_HEADER, columnValues, headerKey, headerUnit } from './table'

// __MACOSX/ and .DS_Store are artifacts of zipping a folder on macOS, not real content.
const IGNORED_PATH_PATTERN = /(^|\/)(__MACOSX|\.DS_Store)(\/|$)/i

// Errors here are user-facing: the message surfaces directly in the upload toast.
export class ConditionsUploadError extends Error {}

const isCsvName = (name) => /\.csv$/i.test(name)
const isZipName = (name) => /\.zip$/i.test(name)

// The CSV files in an upload: the file itself, or each CSV inside a zip.
export async function readConditionsFiles(file) {
  const buffer = await file.arrayBuffer()
  const decoder = new TextDecoder('utf-8')

  if (isCsvName(file.name)) {
    return [{ name: file.name, text: decoder.decode(buffer) }]
  }
  if (!isZipName(file.name)) {
    throw new ConditionsUploadError('Upload a .csv file or a .zip file of CSV files.')
  }

  let entries
  try {
    entries = unzipSync(new Uint8Array(buffer))
  } catch (_error) {
    throw new ConditionsUploadError('That file is not a valid .zip file.')
  }
  const files = Object.entries(entries)
    .filter(([path]) => isCsvName(path) && !IGNORED_PATH_PATTERN.test(path))
    .map(([path, data]) => ({ name: path, text: decoder.decode(data) }))

  if (files.length === 0) {
    throw new ConditionsUploadError('That .zip does not contain a CSV file.')
  }
  return files
}

// One CSV as { headers, rows }. Each row is [time, ...values], and an empty cell is null.
export function parseConditionsCsv({ name, text }) {
  const [headerCells, ...dataRows] = parseCsv(text)
  if (!headerCells) throw new ConditionsUploadError(`${name} is empty.`)

  const headers = headerCells.map((header) => header.trim())
  if (headers[0] !== TIME_HEADER) {
    throw new ConditionsUploadError(`The first column of ${name} must be "${TIME_HEADER}".`)
  }
  const duplicate = headers.find((header, index) => headers.indexOf(header) !== index)
  if (duplicate) {
    throw new ConditionsUploadError(`${name} has the column "${duplicate}" more than once.`)
  }

  const rows = dataRows.map((cells, rowIndex) => {
    const line = rowIndex + 2
    if (cells.length > headers.length) {
      throw new ConditionsUploadError(`Line ${line} of ${name} has more cells than headers.`)
    }
    return headers.map((header, column) => {
      const cell = (cells[column] ?? '').trim()
      if (cell === '') {
        if (column === 0) throw new ConditionsUploadError(`Line ${line} of ${name} has no time.`)
        return null
      }
      const value = Number(cell)
      if (!Number.isFinite(value)) {
        throw new ConditionsUploadError(
          `Line ${line} of ${name} has "${cell}" in "${header}". Use a number or leave it empty.`
        )
      }
      if (column === 0 && value < 0) {
        throw new ConditionsUploadError(`Line ${line} of ${name} has a negative time.`)
      }
      return value
    })
  })

  return { name, headers, rows }
}

// All the uploaded files, merged by time. Returns
// { columns: [{ header, key, item, file }], skipped: [{ header, file, reason }], cells, times },
// where cells is a Map of time -> Map of key -> number | null. A null is an empty cell in the
// file. A key without an entry at a time is not in the file at that time.
export function buildConditionsUpload(parsedFiles, items) {
  const itemsByKey = new Map(items.map((item) => [item.key, item]))
  const columns = []
  const skipped = []
  const cells = new Map()
  const columnKeys = new Set()

  parsedFiles.forEach(({ name, headers, rows }) => {
    const fileColumns = headers.map((header, index) => {
      if (index === 0) return null
      const key = headerKey(header)
      const item = itemsByKey.get(key)
      if (!item) {
        const reason = /^(ENV|CONC|PHOTO|EMIS|LOSS|USER|SURF)\./.test(header)
          ? 'not in the mechanism'
          : 'not a condition column'
        skipped.push({ header, file: name, reason })
        return null
      }
      if (!isAcceptedUnit(key, headerUnit(header))) {
        skipped.push({
          header,
          file: name,
          reason: `unit "${headerUnit(header)}" is not supported`,
        })
        return null
      }
      if (columnKeys.has(key)) {
        skipped.push({ header, file: name, reason: 'another column already sets this value' })
        return null
      }
      columnKeys.add(key)
      columns.push({ header, key, item, file: name })
      return key
    })

    rows.forEach(([time, ...values]) => {
      if (!cells.has(time)) cells.set(time, new Map())
      const row = cells.get(time)
      values.forEach((value, index) => {
        const key = fileColumns[index + 1]
        if (key) row.set(key, value)
      })
    })
  })

  const times = [...cells.keys()].sort((a, b) => a - b)
  return { columns, skipped, cells, times }
}

// The conditions table after the upload. Pure.
//   keys            - the selected column keys; the other columns in the file are ignored
//   mode            - 'replace' clears all the conditions first; 'merge' changes only the
//                     selected columns at the times in the file
//   emptyOverwrites - in merge mode, an empty cell clears the existing value at that time
export function applyConditionsUpload(table, upload, { keys, mode, emptyOverwrites = false }) {
  const replace = mode === 'replace'

  // Each column as a Map of time -> value, under the header it is stored with. An existing
  // header keeps its spelling.
  const columns = new Map()
  const headerFor = new Map()
  if (!replace) {
    Object.keys(table.columns).forEach((header) => {
      const values = columnValues(table, header)
      columns.set(header, new Map(table.times.map((time, index) => [time, values[index]])))
      headerFor.set(headerKey(header), header)
    })
  }
  upload.columns.forEach(({ key, header }) => {
    if (!keys.has(key) || headerFor.has(key)) return
    headerFor.set(key, header)
    columns.set(header, new Map())
  })

  const times = new Set(replace ? [] : table.times)
  upload.cells.forEach((cellRow, time) => {
    cellRow.forEach((value, key) => {
      if (!keys.has(key)) return
      const column = columns.get(headerFor.get(key))
      if (value !== null) {
        column.set(time, value)
        times.add(time)
      } else if (emptyOverwrites && !replace) {
        column.delete(time)
      }
    })
  })

  // A time that only has empty cells for the selected columns does not add a new row.
  const sortedTimes = [...times].sort((a, b) => a - b)
  return {
    times: sortedTimes,
    columns: Object.fromEntries(
      [...columns].map(([header, values]) => [
        header,
        sortedTimes.map((time) => values.get(time) ?? null),
      ])
    ),
  }
}
