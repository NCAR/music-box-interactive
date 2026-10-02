import { Dialog } from '../../ui/dialog'
import { Button } from '../../ui/button'
import { ADD_BUTTON } from '../fieldStyles'
import { ColumnLabel } from './ColumnLabel'

// The dialog that adds a species or a reaction: one row of fields under the column labels, in
// the style of the tables. It stays open after an add, so several items can be added one after
// the other; the fields clear after each add.
//   columns - [{ id, label, unit?, unitTitle?, className? }]
//   render  - (column) => the field for that column
//   onAdd   - adds the item from the fields
//   extra   - shown above the row, e.g. the reaction type picker
export function AddRowDialog({ title, columns, render, onAdd, onClose, extra }) {
  return (
    <Dialog
      title={title}
      onClose={onClose}
      className="max-w-6xl"
      footer={
        <>
          {/* "Done": every add has saved already, so there is nothing to cancel. */}
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
          <Button className={ADD_BUTTON} onClick={onAdd}>
            Add
          </Button>
        </>
      }
    >
      {extra && <div className="mb-3">{extra}</div>}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-border">
        <table className="w-full text-sm" aria-label={title}>
          <thead className="bg-assist-secondary text-assist-secondary-foreground">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={`px-4 py-2 text-left font-semibold ${column.className ?? ''}`}
                >
                  <ColumnLabel {...column} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {columns.map((column) => (
                <td key={column.id} className={`px-4 py-2 align-middle ${column.className ?? ''}`}>
                  {render(column)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        Press Enter in any field to add. Blank values stay unset.
      </p>
    </Dialog>
  )
}

export default AddRowDialog
