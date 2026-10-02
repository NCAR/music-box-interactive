import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../ui/button'
import { Dropdown } from '../../ui/dropdown'
import { ColumnPicker } from './ColumnPicker'
import { ColumnLabel } from './ColumnLabel'
import { PAGE_SIZES, useTableSettings } from './tableSettings'

// A table with sortable headers, a column picker and pages, for the species and reaction
// lists. The styling follows the Conditions tables.
//   tableId  - saves the column choice and the page size per browser (see tableSettings)
//   columns  - [{ id, label, unit?, unitTitle?, render(row), sortValue?(row), hideable?, className? }]
//   rows     - the rows to show, already filtered
//   rowKey   - (row) => a stable key
//   toolbar  - shown at the left of the column picker
//   emptyMessage - shown when there are no rows
export function DataTable({ tableId, columns, rows, rowKey, toolbar, emptyMessage }) {
  const { hidden, pageSize, setColumnShown, setPageSize } = useTableSettings(tableId)
  const [sort, setSort] = useState(null) // { id, direction: 1 | -1 }
  const [page, setPage] = useState(0)

  const shownColumns = columns.filter(
    (column) => column.hideable === false || !hidden.has(column.id)
  )
  const hideableColumns = columns.filter((column) => column.hideable !== false)

  const sortedRows = useMemo(() => {
    const column = sort && columns.find((c) => c.id === sort.id)
    if (!column?.sortValue) return rows
    return [...rows].sort((a, b) => {
      const left = column.sortValue(a)
      const right = column.sortValue(b)
      if (left == null || left === '') return 1
      if (right == null || right === '') return -1
      const order =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right), undefined, {
              numeric: true,
              sensitivity: 'base',
            })
      return order * sort.direction
    })
  }, [rows, sort, columns])

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  // A filter or a delete can leave the page past the end.
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1)
  }, [page, pageCount])
  const shownPage = Math.min(page, pageCount - 1)
  const pageRows = sortedRows.slice(shownPage * pageSize, (shownPage + 1) * pageSize)

  // A click sorts ascending, a second click descending, a third click restores the list order.
  const toggleSort = (id) =>
    setSort((previous) =>
      previous?.id !== id
        ? { id, direction: 1 }
        : previous.direction === 1
          ? { id, direction: -1 }
          : null
    )

  const first = sortedRows.length === 0 ? 0 : shownPage * pageSize + 1
  const last = Math.min(sortedRows.length, (shownPage + 1) * pageSize)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">{toolbar}</div>
        <ColumnPicker columns={hideableColumns} hidden={hidden} onChange={setColumnShown} />
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-assist-secondary text-assist-secondary-foreground">
            <tr>
              {shownColumns.map((column) => {
                const sorted = sort?.id === column.id ? sort.direction : 0
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      sorted === 1 ? 'ascending' : sorted === -1 ? 'descending' : undefined
                    }
                    className={`px-4 py-2 text-left font-semibold ${column.className ?? ''}`}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.id)}
                        className="inline-flex items-center gap-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-assist-secondary-ring"
                      >
                        <ColumnLabel {...column} />
                        {sorted === 1 && <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />}
                        {sorted === -1 && <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />}
                      </button>
                    ) : (
                      <ColumnLabel {...column} />
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={shownColumns.length} className="px-4 py-8 text-center text-muted">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {pageRows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-gray-200 dark:border-border hover:bg-gray-50 dark:hover:bg-surface-hover"
              >
                {shownColumns.map((column) => (
                  <td
                    key={column.id}
                    className={`px-4 py-2 align-middle ${column.className ?? ''}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-muted">
        <span>Rows per page</span>
        <div className="w-20">
          <Dropdown
            value={String(pageSize)}
            onChange={(value) => {
              setPageSize(Number(value))
              setPage(0)
            }}
            className="h-8"
            options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
          />
        </div>
        <span>
          {first}–{last} of {sortedRows.length}
        </span>
        <Button
          variant="secondary"
          size="sm"
          aria-label="Previous page"
          disabled={shownPage === 0}
          onClick={() => setPage(shownPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          aria-label="Next page"
          disabled={shownPage >= pageCount - 1}
          onClick={() => setPage(shownPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default DataTable
