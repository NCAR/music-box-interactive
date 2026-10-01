// Builds a CSV string from column headers and row arrays (values in header order).
export function toCsv(headers, rows) {
  const escape = (value) => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  const lines = [headers.map(escape).join(',')]
  for (const row of rows) {
    lines.push(row.map(escape).join(','))
  }
  return lines.join('\n')
}

// Splits CSV text into rows of string cells. Handles quoted cells (with "" escapes, commas and
// line breaks inside), CRLF line endings and a leading byte-order mark. Blank lines are dropped.
export function parseCsv(text) {
  const source = String(text ?? '').replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  const endCell = () => {
    row.push(cell)
    cell = ''
  }
  const endRow = () => {
    endCell()
    if (row.some((value) => value.trim() !== '')) rows.push(row)
    row = []
  }

  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (inQuotes) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        cell += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      endCell()
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      endRow()
    } else {
      cell += char
    }
  }
  if (cell !== '' || row.length > 0) endRow()

  return rows
}
