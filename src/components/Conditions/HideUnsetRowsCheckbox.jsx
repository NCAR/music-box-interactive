import { Info } from 'lucide-react'

const TOOLTIP =
  'Shows only the rows where the conditions in this table have a value. All the tabs share one ' +
  'list of times, so a row with unset cells shows up when another condition has a value at ' +
  'that time but these conditions do not.'

// The "Hide unset rows" checkbox in the header of each Conditions tab table.
export function HideUnsetRowsCheckbox({ checked, onChange }) {
  return (
    <label
      className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-sm text-ink"
      title={TOOLTIP}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-assist-secondary-ring"
      />
      Hide unset rows
      <Info className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
    </label>
  )
}

export default HideUnsetRowsCheckbox
