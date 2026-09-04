import { useState, useEffect } from 'react'

export const TIME_RANGE_UNITS = [
  { id: 'seconds', label: 'Seconds', divisor: 1 },
  { id: 'hours', label: 'Hours', divisor: 3600 },
]

// `sigDigits` renders in exponential notation, which is required for integrated rates:
// they run around 1e-6 to 1e-8, and fixed-point rounding would show 1.8e-7 as "0.000000"
// and commit a literal 0 on blur. Time values are plain magnitudes and pass no sigDigits.
export const formatBound = (raw, divisor, sigDigits) => {
  const scaled = raw / divisor
  return String(sigDigits != null ? scaled.toExponential(sigDigits) : scaled)
}

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
