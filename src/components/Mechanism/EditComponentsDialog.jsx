import { useState } from 'react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { ADD_BUTTON, TEXT_INPUT_SM } from './fieldStyles'

const FIELD_INPUT = `w-full ${TEXT_INPUT_SM.replace('text-center', 'text-left')} font-mono`

// Edits all species fields of one reaction together, for a type whose equation cannot be one
// text (a branched reaction has two product lists).
//   fields - [{ key, label, value }], value as the text "2NO2 + O"
//   onSave - receives the typed text by field key, and returns whether the save worked
export function EditComponentsDialog({ title, fields, onSave, onClose }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((field) => [field.key, field.value]))
  )

  const save = () => {
    if (onSave(values)) onClose()
  }

  return (
    <Dialog
      title={title}
      onClose={onClose}
      className="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button className={ADD_BUTTON} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <label key={field.key} className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-muted">{field.label}</span>
            <input
              type="text"
              autoFocus={index === 0}
              value={values[field.key] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  save()
                }
              }}
              placeholder="O1D + N2"
              className={FIELD_INPUT}
            />
          </label>
        ))}
      </div>
    </Dialog>
  )
}

export default EditComponentsDialog
