export const TIME_RANGE_UNITS = [
  { id: 'seconds', label: 'Seconds', divisor: 1 },
  { id: 'hours', label: 'Hours', divisor: 3600 },
]

// `sigDigits` renders in exponential notation, which is required for integrated rates:
// they run around 1e-6 to 1e-8, and fixed-point rounding would show 1.8e-7 as "0.000000"
// and commit a literal 0 on blur. Time values are plain magnitudes and pass no sigDigits.
export const formatBound = (raw, divisor, sigDigits) => {
  // A non-finite bound (e.g. an upstream NaN range) would otherwise render as the literal
  // text "NaN"/"Infinity" and get stuck there -- an editable field needs a real number to
  // resume editing from.
  if (!Number.isFinite(raw)) return '0'
  const scaled = raw / divisor
  return String(sigDigits != null ? scaled.toExponential(sigDigits) : scaled)
}
