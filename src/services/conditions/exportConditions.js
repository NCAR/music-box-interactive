import { zipSync, strToU8 } from 'fflate'
import { toCsv } from '../../utils/csv'
import { downloadBlob } from '../../utils/downloadJson'
import { CATEGORIES, buildConditionsTable } from './conditionsTable'

const TIME_HEADER = 'time.s'

const inRange = (time, { start = null, end = null } = {}) =>
  (start === null || time >= start) && (end === null || time <= end)

// One CSV for the items: a time.s column, then one column for each item. An unset value is an
// empty cell, never 0. A time where all the items are unset is left out.
function buildCsv(table, items, timeRange) {
  const rows = table.times
    .filter((time) => inRange(time, timeRange))
    .map((time) => {
      const row = table.rows.get(time)
      return [time, ...items.map((item) => row.get(item.key) ?? null)]
    })
    .filter((row) => row.slice(1).some((value) => value !== null))

  return toCsv([TIME_HEADER, ...items.map((item) => item.header)], rows)
}

// The files for a conditions download. `items` are the selected items from
// listConditionItems, in column order. `layout` is 'single' (one CSV) or 'perCategory' (one
// CSV for each category that has a selected item).
export function buildConditionsFiles({ conditions, items, layout = 'single', timeRange = {} }) {
  const table = buildConditionsTable(conditions)

  if (layout === 'single') {
    return [{ name: 'conditions.csv', text: buildCsv(table, items, timeRange) }]
  }

  return CATEGORIES.flatMap((category) => {
    const categoryItems = items.filter((item) => item.category === category.id)
    if (categoryItems.length === 0) return []
    return [{ name: category.fileName, text: buildCsv(table, categoryItems, timeRange) }]
  })
}

// Downloads the conditions as conditions.csv, or as conditions.zip for the per-category layout.
export function downloadConditions(options) {
  const files = buildConditionsFiles(options)

  if (options.layout === 'single') {
    downloadBlob(new Blob([files[0].text], { type: 'text/csv' }), files[0].name)
    return
  }

  const zipped = zipSync(Object.fromEntries(files.map((file) => [file.name, strToU8(file.text)])))
  downloadBlob(new Blob([zipped], { type: 'application/zip' }), 'conditions.zip')
}
