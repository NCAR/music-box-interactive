import { useRef, useState } from 'react'
import { Columns3 } from 'lucide-react'
import { Button } from '../../ui/button'
import { useClickOutside } from '../../../hooks/useClickOutside'

// A "Columns" button with a checklist that shows or hides each column that can be hidden.
//   columns - [{ id, label }]
export function ColumnPicker({ columns, hidden, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false), open)

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="secondary"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <Columns3 className="h-4 w-4" aria-hidden="true" />
        Columns
      </Button>
      {open && (
        <div
          role="group"
          aria-label="Shown columns"
          className="absolute right-0 z-30 mt-1 max-h-72 w-60 overflow-y-auto rounded-lg border border-border bg-white dark:bg-surface p-2 shadow-lg"
        >
          {columns.map((column) => (
            <label
              key={column.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-ink hover:bg-surface-hover"
            >
              <input
                type="checkbox"
                checked={!hidden.has(column.id)}
                onChange={(e) => onChange(column.id, e.target.checked)}
                className="h-4 w-4 accent-action"
              />
              <span className="truncate font-mono">{column.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default ColumnPicker
