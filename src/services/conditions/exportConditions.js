import { zipSync, strToU8 } from 'fflate'
import { toCsv } from '../../utils/csv'
import { downloadBlob } from '../../utils/downloadJson'
import { CATEGORIES } from './conditionItems'
import { TIME_HEADER, columnValues, findHeader } from './table'

const inRange = (time, { start = null, end = null } = {}) =>
  (start === null || time >= start) && (end === null || time <= end)

// One CSV for the items: a time.s column, then one column for each item. An unset value is an
// empty cell, never 0. A time where all the items are unset is left out.
function buildCsv(table, items, timeRange) {
  const columns = items.map((item) => {
    const header = findHeader(table, item.key)
    return header ? columnValues(table, header) : table.times.map(() => null)
  })
  const rows = table.times
    .map((time, index) => [time, ...columns.map((values) => values[index])])
    .filter(
      ([time, ...values]) => inRange(time, timeRange) && values.some((value) => value !== null)
    )

  return toCsv([TIME_HEADER, ...items.map((item) => item.header)], rows)
}

// The files for a conditions download. `items` are the selected items from
// listConditionItems, in column order. `layout` is 'single' (one CSV) or 'perCategory' (one
// CSV for each category that has a selected item).
export function buildConditionsFiles({ table, items, layout = 'single', timeRange = {} }) {
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
