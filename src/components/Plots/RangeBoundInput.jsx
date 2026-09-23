import { useState, useEffect } from 'react'
import { formatBound } from './timeRangeUnits'
import { cn } from '../../lib/utils'

// Displays values in the selected time unit while storing them in seconds.
// Clamps commits to [min, max] to prevent the range start from exceeding the end.
export function RangeBoundInput({
  value,
  divisor = 1,
  onCommit,
  className,
  sigDigits,
  decimals,
  min,
  max,
  onBelowMin,
  flashOnCommit = false,
}) {
  const displayValue = formatBound(value, divisor, sigDigits, decimals)
  const [draft, setDraft] = useState(displayValue)
  const [justCommitted, setJustCommitted] = useState(false)

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
    if (Number.isFinite(min) && next < min) {
      if (onBelowMin) {
        onBelowMin(next, min)
        setDraft(displayValue)
        return
      }
      next = min
    }
    if (Number.isFinite(max)) next = Math.min(max, next)

    // Re-sync the draft after clamping: state may already contain the clamped value, so the
    // unchanged value prop won't trigger the effect to replace the out-of-range input.
    setDraft(formatBound(next, divisor, sigDigits, decimals))
    onCommit(next)

    if (flashOnCommit) {
      setJustCommitted(true)
      setTimeout(() => setJustCommitted(false), 600)
    }
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
      className={cn(
        className,
        'transition-colors duration-300',
        justCommitted && 'border-action bg-assist-secondary'
      )}
    />
  )
}
