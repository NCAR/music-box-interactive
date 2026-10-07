import { InfoTooltip } from '../ui/tooltip'
import { FormulaText } from './FormulaText'

// One rate parameter of an add-reaction form: the symbol (with its explanation), the input, and
// the unit, joined into a single row.
export function ParameterRow({ symbol, name, description, unit, placeholder, value, onChange }) {
  return (
    <div className="flex h-9 items-stretch">
      <span className="flex w-12 flex-shrink-0 items-center justify-center gap-1 rounded-l-lg border border-r-0 border-border bg-assist-secondary text-sm font-semibold text-assist-secondary-foreground">
        {symbol}
        <InfoTooltip title={name} description={description} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={`${symbol}, ${name}`}
        className="min-w-0 flex-1 border border-border bg-white px-2 text-left font-mono text-sm text-ink placeholder:text-gray-400 focus:z-10 focus:outline-none focus:ring-2 focus:ring-action dark:bg-surface dark:placeholder:text-muted"
      />
      <span className="flex w-36 flex-shrink-0 items-center justify-center whitespace-nowrap rounded-r-lg border border-l-0 border-border bg-assist-secondary px-1 text-sm text-assist-secondary-foreground">
        <FormulaText text={unit} />
      </span>
    </div>
  )
}
