// shortLabel is the abbreviated form ("s"/"hr") used in chart axis titles and tooltips,
export const TIME_RANGE_UNITS = [
  { id: 'seconds', label: 'Seconds', shortLabel: 's', divisor: 1 },
  { id: 'hours', label: 'Hours', shortLabel: 'hr', divisor: 3600 },
]

// sigDigits uses exponential notation for integrated rates (~1e-6 to 1e-8),
// preventing small values like 1.8e-7 from rounding to 0 on blur.
// Time values use plain magnitudes without sigDigits.

export const formatBound = (raw, divisor, sigDigits, decimals) => {
  // Non-finite bounds (e.g. an upstream NaN range) would render as "NaN"/"Infinity" and
  // prevent editing. Editable fields need a valid number to resume from.
  if (!Number.isFinite(raw)) return '0'
  const scaled = raw / divisor
  if (sigDigits != null) return String(scaled.toExponential(sigDigits))
  // parseFloat trims trailing zeros from toFixed (e.g. "3.00" -> 3 -> "3") so whole numbers
  // still read cleanly instead of always showing the full decimal precision.
  if (decimals != null) return String(parseFloat(scaled.toFixed(decimals)))
  return String(scaled)
}
