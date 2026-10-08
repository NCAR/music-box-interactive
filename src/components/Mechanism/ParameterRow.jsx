import { InfoTooltip } from '../ui/tooltip'
import { FormulaText } from './FormulaText'

// One rate parameter of an add-reaction form: the symbol (with its explanation), the input, and
// the unit, joined into one row.
export const PARAMETER_GRID = 'grid grid-cols-[max-content_minmax(0,1fr)_max-content] gap-y-3'

export function ParameterRow({ symbol, name, description, unit, placeholder, value, onChange }) {
  return (
    <div className="contents">
      <span className="flex h-9 items-center justify-center gap-1 rounded-l-lg border border-r-0 border-border bg-assist-secondary px-2 text-sm font-semibold text-assist-secondary-foreground">
        {symbol}
        <InfoTooltip title={name} description={description} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={`${symbol}, ${name}`}
        className="h-9 min-w-0 border border-border bg-white px-2 text-left font-mono text-sm text-ink placeholder:text-gray-400 focus:z-10 focus:outline-none focus:ring-2 focus:ring-action dark:bg-surface dark:placeholder:text-muted"
      />
      <span className="flex h-9 items-center justify-center whitespace-nowrap rounded-r-lg border border-l-0 border-border bg-assist-secondary px-3 text-sm text-assist-secondary-foreground">
        <FormulaText text={unit} />
      </span>
    </div>
  )
}
