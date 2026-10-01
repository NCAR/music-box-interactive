import { unzipSync } from 'fflate'
import { parseCsv } from '../../utils/csv'
import {
  DENSITY_KEY,
  PRESSURE_KEY,
  TEMPERATURE_KEY,
  buildConditionsTable,
  headerKey,
  headerUnit,
  isAcceptedUnit,
} from './conditionsTable'
import { DENSITY_SERIES_KEY } from '../../utils/environmentSeries'
import { DEFAULT_PRESSURE, DEFAULT_TEMPERATURE } from '../../components/Conditions/evolvingSeries'

const TIME_HEADER = 'time.s'

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
        skipped.push({ header, file: name, reason: `unit "${headerUnit(header)}" is not supported` })
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

// The Redux conditions after the upload. Pure: the caller dispatches the result with
// applyConditionsData.
//   keys            - the selected column keys; the other columns in the file are ignored
//   mode            - 'replace' clears all the conditions first; 'merge' changes only the
//                     selected columns at the times in the file
//   emptyOverwrites - in merge mode, an empty cell clears the existing value at that time
//
// All values go to the evolving series, with t=0 as the initial row. The Conditions tabs
// show these series, so the initial snapshot values are moved there too.
export function applyConditionsUpload(conditions, upload, { keys, mode, emptyOverwrites = false }) {
  const replace = mode === 'replace'
  const base = replace ? { times: [0], rows: new Map([[0, new Map()]]) } : buildConditionsTable(conditions)
  const rows = new Map([...base.rows].map(([time, row]) => [time, new Map(row)]))
  const keptTimes = new Set(rows.keys())

  upload.cells.forEach((cellRow, time) => {
    cellRow.forEach((value, key) => {
      if (!keys.has(key)) return
      if (!rows.has(time)) rows.set(time, new Map())
      if (value !== null) {
        rows.get(time).set(key, value)
        keptTimes.add(time)
      } else if (emptyOverwrites && !replace) {
        rows.get(time).delete(key)
      }
    })
  })

  // A time that only had empty cells for the selected columns does not add a new row.
  const times = [...rows.keys()].filter((time) => keptTimes.has(time)).sort((a, b) => a - b)

  // The header that each key is stored under. An existing header keeps its spelling.
  const headers = new Map()
  if (!replace) {
    Object.keys(conditions?.evolving?.additionalSeries || {}).forEach((header) =>
      headers.set(headerKey(header), header)
    )
    Object.keys(conditions?.rateConstants || {}).forEach((header) => {
      if (!headers.has(headerKey(header))) headers.set(headerKey(header), header)
    })
  }
  upload.columns.forEach(({ key, header }) => {
    if (keys.has(key) && !headers.has(key)) headers.set(key, header)
  })
  headers.set(DENSITY_KEY, DENSITY_SERIES_KEY)

  const seriesKeys = new Set()
  times.forEach((time) =>
    rows.get(time).forEach((_, key) => {
      if (key !== TEMPERATURE_KEY && key !== PRESSURE_KEY) seriesKeys.add(key)
    })
  )
  const column = (key) => times.map((time) => rows.get(time).get(key) ?? null)
  const additionalSeries = Object.fromEntries(
    [...seriesKeys].map((key) => [headers.get(key) ?? (key.startsWith('CONC.') ? `${key}.mol m-3` : key), column(key)])
  )

  const zeroRow = rows.get(0) ?? new Map()
  const rowReactionType = replace
    ? {}
    : Object.fromEntries(
        Object.entries(conditions?.evolving?.rowReactionType || {}).filter(([time]) =>
          times.includes(Number(time))
        )
      )

  return {
    initial: {
      ...(conditions?.initial || {}),
      temperature: zeroRow.get(TEMPERATURE_KEY) ?? DEFAULT_TEMPERATURE,
      pressure: zeroRow.get(PRESSURE_KEY) ?? DEFAULT_PRESSURE,
      concentrations: {},
    },
    rateConstants: {},
    evolving: {
      ...(conditions?.evolving || {}),
      enabled: true,
      times,
      temperature: column(TEMPERATURE_KEY),
      pressure: column(PRESSURE_KEY),
      additionalSeries,
      rowReactionType,
    },
  }
}
