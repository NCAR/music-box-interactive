import { useState, useEffect } from 'react'
import { formatBound } from './timeRangeUnits'

// Displays values in the selected time unit while storing them in seconds.
// Clamps commits to [min, max] to prevent the range start from exceeding the end.
export function RangeBoundInput({ value, divisor = 1, onCommit, className, sigDigits, min, max }) {
  const displayValue = formatBound(value, divisor, sigDigits)
  const [draft, setDraft] = useState(displayValue)

  useEffect(() => {
    setDraft(displayValue)
  }, [displayValue])

  const commit = () => {
    // Untouched field: committing would discard precision omitted from the display.
    // Focusing and leaving the field should be lossless.
    if (draft === displayValue) return

    const parsed = parseFloat(draft)
    if (isNaN(parsed)) {
      setDraft(displayValue)
      return
    }

    let next = parsed * divisor
    if (Number.isFinite(min)) next = Math.max(min, next)
    if (Number.isFinite(max)) next = Math.min(max, next)

    // Re-sync the draft after clamping: state may already contain the clamped value, so the
    // unchanged value prop won't trigger the effect to replace the out-of-range input.
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
