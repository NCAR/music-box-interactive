import { useState } from 'react'
import { TEXT_INPUT_SM } from '../fieldStyles'

const CELL_INPUT = `w-full ${TEXT_INPUT_SM.replace('text-center', 'text-left')} font-mono`

// A table cell that shows its value and turns into an input on click. Enter or leaving the
// input saves; Escape cancels. A cell only holds an input while it is edited, so a long table
// stays light.
//   value       - the text that the input starts with
//   display     - what the cell shows (defaults to the value)
//   placeholder - shown in the input while the cell is edited (e.g. the solver default). An unset
//                 value shows as an empty cell, so it cannot look like a value that is set.
//   onCommit    - receives the typed text
export function EditableCell({ value, display, placeholder = '', label, onCommit }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        defaultValue={value}
        placeholder={placeholder}
        aria-label={label}
        onBlur={(e) => {
          setEditing(false)
          if (e.target.value !== value) onCommit(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            e.currentTarget.value = value
            e.currentTarget.blur()
          }
        }}
        className={CELL_INPUT}
      />
    )
  }

  const shown = display ?? value
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={label ? `Edit ${label}` : undefined}
      title="Click to edit"
      className="w-full min-h-[1.5rem] rounded px-1 text-left font-mono hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-assist-secondary-ring"
    >
      {shown !== '' && shown != null ? shown : null}
    </button>
  )
}

export default EditableCell
