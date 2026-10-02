import { Trash2 } from 'lucide-react'

// The remove button of a table row: a small trash icon, so the row stays short. `label` names
// the item, e.g. "Remove O3".
export function RemoveRowButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded p-1 text-danger hover:bg-caution focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}

export default RemoveRowButton
