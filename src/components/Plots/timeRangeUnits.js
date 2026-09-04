export const TIME_RANGE_UNITS = [
  { id: 'seconds', label: 'Seconds', divisor: 1 },
  { id: 'hours', label: 'Hours', divisor: 3600 },
]

// sigDigits uses exponential notation for integrated rates (~1e-6 to 1e-8),
// preventing small values like 1.8e-7 from rounding to 0 on blur.
// Time values use plain magnitudes without sigDigits.

export const formatBound = (raw, divisor, sigDigits) => {
  // Non-finite bounds (e.g. an upstream NaN range) would render as "NaN"/"Infinity" and
  // prevent editing. Editable fields need a valid number to resume from.
  if (!Number.isFinite(raw)) return '0'
  const scaled = raw / divisor
  return String(sigDigits != null ? scaled.toExponential(sigDigits) : scaled)
}
