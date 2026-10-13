import { Info } from 'lucide-react'
import { FormulaText } from '../Mechanism/FormulaText'

// A focusable info icon that reveals a short explanation on hover or keyboard focus.
export function InfoTooltip({ title, description }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={`About ${title}`}
        className="inline-flex rounded-full text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-56 whitespace-normal rounded-lg border border-border bg-white p-2 text-xs font-sans text-ink shadow-lg group-hover:block group-focus-within:block dark:bg-surface"
      >
        <span className="block font-semibold">
          <FormulaText text={title} />
        </span>
        {description && (
          <span className="block text-muted">
            <FormulaText text={description} />
          </span>
        )}
      </span>
    </span>
  )
}
