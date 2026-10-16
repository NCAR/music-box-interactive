// Tick rules copied from Recharts, so that the plots kept their axes when they moved to d3.

export const TICK_COUNT = 5

// Gap in pixels that Recharts keeps between two tick labels.
const MIN_TICK_GAP = 5

const clean = (value) => Number(value.toPrecision(12))

// A rounded step near `rough`: 0.05 times a power of ten, or 0.1 times one for steps in [1, 10).
// `correction` makes the step one size larger each time.
function adaptiveStep(rough, correction = 0) {
  if (!(rough > 0)) return 0
  const digitCount = Math.floor(Math.log10(rough)) + 1
  const magnitude = 10 ** digitCount
  const ratioStep = digitCount !== 1 ? 0.05 : 0.1
  return clean(
    (Math.ceil(clean(rough / magnitude / ratioStep)) + correction) * ratioStep * magnitude
  )
}

function range(start, end, step) {
  const ticks = []
  for (let i = 0; clean(start + i * step) < end && i < 1e5; i++) ticks.push(clean(start + i * step))
  return ticks
}

// The ticks for a number axis with a fixed domain: a rounded step from the low end, and the
// high end itself.
export function fixedDomainTicks([min, max], count = TICK_COUNT) {
  if (!(max > min)) return [min]
  const step = adaptiveStep((max - min) / (count - 1))
  return [...range(min, max, step), max]
}

// The ticks for a number axis with an automatic domain. The ticks reach past the data to
// rounded values, and the axis domain becomes the first and the last tick.
export function niceTicks([min, max], count = TICK_COUNT) {
  if (min === max) {
    const middle = Math.floor(min)
    const middleIndex = Math.floor((count - 1) / 2)
    return Array.from({ length: count }, (_, i) => middle + i - middleIndex)
  }
  for (let correction = 0; ; correction++) {
    const step = adaptiveStep((max - min) / (count - 1), correction)
    let middle
    if (min <= 0 && max >= 0) {
      middle = 0
    } else {
      middle = (min + max) / 2
      middle = clean(middle - (middle % step))
    }
    let below = Math.ceil(clean((middle - min) / step))
    let above = Math.ceil(clean((max - middle) / step))
    const scaleCount = below + above + 1
    if (scaleCount > count) continue
    if (scaleCount < count) {
      if (max > 0) above += count - scaleCount
      else below += count - scaleCount
    }
    const tickMin = clean(middle - below * step)
    const tickMax = clean(middle + above * step)
    return range(tickMin, tickMax + 0.1 * step, step)
  }
}

// The x tick labels that fit, chosen from the last one back, as Recharts does for its default
// "preserveEnd" interval. The last label moves left when it does not fit before `end`.
// @param {{coordinate: number, width: number}[]} ticks - In order of coordinate
// @returns {number[]} The label position for each tick, or null for a hidden label
export function preserveEndLabels(ticks, start, end) {
  const positions = ticks.map(() => null)
  let limit = end
  for (let i = ticks.length - 1; i >= 0; i--) {
    const { coordinate, width } = ticks[i]
    let position = coordinate
    if (i === ticks.length - 1) {
      const overflow = coordinate + width / 2 - limit
      if (overflow > 0) position = coordinate - overflow
    }
    if (position - width / 2 >= start && position + width / 2 <= limit) {
      positions[i] = position
      limit = position - (width / 2 + MIN_TICK_GAP)
    }
  }
  return positions
}

// Round a value up to a human-friendly scale (1, 2, 5, or 10 times a power of 10)
function niceNumber(x) {
  const exponent = Math.floor(Math.log10(x))
  const fraction = x / 10 ** exponent
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return niceFraction * 10 ** exponent
}

// The domain of a time axis: the range of the times, with 5% padding on each side and never
// below zero. A fixed rule keeps the padding the same in each time unit.
export function paddedTimeDomain(times) {
  const finite = times.filter((t) => isFinite(t))
  if (finite.length === 0) return [0, 1]

  const minTime = Math.min(...finite)
  const maxTime = Math.max(...finite)
  if (minTime === maxTime) return [Math.max(0, minTime - 1), maxTime + 1]

  const padding = (maxTime - minTime) * 0.05
  return [Math.max(0, minTime - padding), maxTime + padding]
}

// Use a reader-friendly step (in 0.5-unit increments) for gridlines in minutes, hours, and days.
const TIME_TICK_STEP = 0.5
const TARGET_TIME_TICKS = 5

// The ticks of a time axis whose values are in the selected unit. Seconds return undefined, so
// the axis uses its default ticks.
export function timeAxisTicks([minDomain, maxDomain], divisor) {
  if (divisor === 1) return undefined
  if (maxDomain <= 0) return [0]

  const rawStep = maxDomain / TARGET_TIME_TICKS
  const step = Math.ceil(niceNumber(rawStep) / TIME_TICK_STEP) * TIME_TICK_STEP

  const ticks = []
  for (let t = Math.ceil(minDomain / step - 1e-9) * step; t <= maxDomain + 1e-9; t += step) {
    // `|| 0` turns -0 into 0, so the first label is not "-0".
    ticks.push(Math.round(t * 1000) / 1000 || 0)
  }
  return ticks
}
