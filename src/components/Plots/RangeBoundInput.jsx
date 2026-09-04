import { useState, useEffect } from 'react'
import { formatBound } from './timeRangeUnits'

// Number input that displays values in the selected time unit while storing them in seconds.
// Commits are clamped to [min, max], keeping a range's start from crossing its end.
export function RangeBoundInput({ value, divisor = 1, onCommit, className, sigDigits, min, max }) {
  const displayValue = formatBound(value, divisor, sigDigits)
  const [draft, setDraft] = useState(displayValue)

  useEffect(() => {
    setDraft(displayValue)
  }, [displayValue])

  const commit = () => {
    // Untouched field: committing would round-trip the *displayed* value back into state,
    // discarding precision the display omits. Merely focusing and leaving must be lossless.
    if (draft === displayValue) return

    const parsed = parseFloat(draft)
    if (isNaN(parsed)) {
      setDraft(displayValue)
      return
    }

    let next = parsed * divisor
    if (Number.isFinite(min)) next = Math.max(min, next)
    if (Number.isFinite(max)) next = Math.min(max, next)

    // Re-sync the draft explicitly: a clamped entry often equals the value already in
    // state, so the `value` prop never changes and the effect above won't fire to
    // replace the out-of-range text the user typed.
    setDraft(formatBound(next, divisor, sigDigits))
    onCommit(next)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
      }}
      className={className}
    />
  )
}
