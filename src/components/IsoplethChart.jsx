import { useMemo, useState } from 'react'
import { contours, geoPath, scaleSequential, interpolateViridis, extent } from 'd3'
import { Card, CardContent } from './ui/card'
import { Mountain } from 'lucide-react'

const CHART_HEIGHT = 500
const PAD_LEFT = 72
const PAD_RIGHT = 24
const PAD_TOP = 16
const PAD_BOTTOM = 48
const THRESHOLD_COUNT = 12
const CANDIDATE_TICK_PERCENTS = [1, 2, 5, 10, 20, 30, 50, 70, 100, 150, 200, 300, 500, 700, 1000]

// Grid samples are evenly spaced in log space (see IsoplethsPage's logSpace), so a factor's
// position along the grid's index axis is linear in log(factor) -- this inverts that mapping to
// place a "nice" percent tick (10%, 100%, 300%, ...) at the right spot without needing a log scale.
function factorToIndex(factor, factors) {
  const logStart = Math.log(factors[0])
  const logEnd = Math.log(factors[factors.length - 1])
  if (logEnd === logStart) return 0
  return ((Math.log(factor) - logStart) / (logEnd - logStart)) * (factors.length - 1)
}

function niceTicks(factors) {
  const minPct = factors[0] * 100
  const maxPct = factors[factors.length - 1] * 100
  return CANDIDATE_TICK_PERCENTS.filter((pct) => pct >= minPct * 0.999 && pct <= maxPct * 1.001)
}

/**
 * IsoplethChart Component
 * Renders a computed isopleth grid (see IsoplethsPage) as filled contour bands. Unlike
 * ExploreChart, this draws with plain SVG rather than canvas -- that canvas workaround exists
 * because Explore redraws on every slider drag, while a grid here is only (re)computed once per
 * "Compute Isopleth" click, so React/SVG's overhead never becomes visible.
 */
export function IsoplethChart({ grid, isRunning }) {
  const [hover, setHover] = useState(null)

  const layout = useMemo(() => {
    if (!grid) return null
    const { resolution, values, xFactors, yFactors } = grid
    const flat = new Array(resolution * resolution)
    for (let row = 0; row < resolution; row++) {
      for (let col = 0; col < resolution; col++) {
        flat[row * resolution + col] = values[row][col] ?? 0
      }
    }

    const [vmin, vmax] = extent(flat)
    const color = scaleSequential(interpolateViridis).domain([vmin ?? 0, vmax ?? 1])
    const contourGenerator = contours()
      .size([resolution, resolution])
      .thresholds(THRESHOLD_COUNT)
    const bands = contourGenerator(flat)

    const path = geoPath()

    return {
      resolution,
      xFactors,
      yFactors,
      flat,
      vmin,
      vmax,
      color,
      bands: bands.map((band) => ({ d: path(band), value: band.value })),
    }
  }, [grid])

  if (!grid && !isRunning) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-muted">
            <div className="flex justify-center mb-2">
              <Mountain className="w-12 h-12" />
            </div>
            <p>Configure a scan and click Compute Isopleth</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!layout) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-muted">Running scan&hellip;</p>
        </CardContent>
      </Card>
    )
  }

  const width = 760
  const height = CHART_HEIGHT
  const plotLeft = PAD_LEFT
  const plotTop = PAD_TOP
  const plotWidth = width - PAD_LEFT - PAD_RIGHT
  const plotHeight = height - PAD_TOP - PAD_BOTTOM
  const cellW = plotWidth / (layout.resolution - 1)
  const cellH = plotHeight / (layout.resolution - 1)
  // Grid index (0,0) is the low-concentration corner; placed at bottom-left, y flipped so index
  // increases upward like a normal chart, and (resolution-1, resolution-1) at top-right.
  const gridTransform = `translate(${plotLeft}, ${plotTop + plotHeight}) scale(${cellW}, ${-cellH})`

  const xTicks = niceTicks(layout.xFactors)
  const yTicks = niceTicks(layout.yFactors)

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    const col = Math.round(((px - plotLeft) / plotWidth) * (layout.resolution - 1))
    const row = Math.round((1 - (py - plotTop) / plotHeight) * (layout.resolution - 1))
    if (col < 0 || col >= layout.resolution || row < 0 || row >= layout.resolution) {
      setHover(null)
      return
    }
    setHover({
      x: px,
      y: py,
      xPercent: layout.xFactors[col] * 100,
      yPercent: layout.yFactors[row] * 100,
      value: layout.flat[row * layout.resolution + col],
    })
  }

  return (
    <Card>
      <CardContent>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          style={{ height: CHART_HEIGHT }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          <g transform={gridTransform}>
            {layout.bands.map((band, i) => (
              <path key={i} d={band.d} fill={layout.color(band.value)} stroke="none" />
            ))}
          </g>
          <g stroke="#5f6368" strokeWidth={1}>
            <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotTop + plotHeight} />
            <line
              x1={plotLeft}
              y1={plotTop + plotHeight}
              x2={plotLeft + plotWidth}
              y2={plotTop + plotHeight}
            />
          </g>
          {xTicks.map((pct) => {
            const x = plotLeft + (factorToIndex(pct / 100, layout.xFactors) / (layout.resolution - 1)) * plotWidth
            return (
              <g key={pct}>
                <line x1={x} y1={plotTop + plotHeight} x2={x} y2={plotTop + plotHeight + 5} stroke="#5f6368" />
                <text x={x} y={plotTop + plotHeight + 18} textAnchor="middle" fontSize="10" fill="#5f6368">
                  {pct}%
                </text>
              </g>
            )
          })}
          {yTicks.map((pct) => {
            const y =
              plotTop +
              plotHeight -
              (factorToIndex(pct / 100, layout.yFactors) / (layout.resolution - 1)) * plotHeight
            return (
              <g key={pct}>
                <line x1={plotLeft - 5} y1={y} x2={plotLeft} y2={y} stroke="#5f6368" />
                <text x={plotLeft - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#5f6368">
                  {pct}%
                </text>
              </g>
            )
          })}
          <text
            x={plotLeft + plotWidth / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill="#1f2937"
          >
            {grid.xLabel} (% of baseline)
          </text>
          <text
            x={14}
            y={plotTop + plotHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill="#1f2937"
            transform={`rotate(-90, 14, ${plotTop + plotHeight / 2})`}
          >
            {grid.yLabel} (% of baseline)
          </text>

          {hover && (
            <g>
              <line
                x1={hover.x}
                y1={plotTop}
                x2={hover.x}
                y2={plotTop + plotHeight}
                stroke="#1f2937"
                strokeDasharray="3,3"
                strokeWidth={1}
              />
              <line
                x1={plotLeft}
                y1={hover.y}
                x2={plotLeft + plotWidth}
                y2={hover.y}
                stroke="#1f2937"
                strokeDasharray="3,3"
                strokeWidth={1}
              />
            </g>
          )}
        </svg>

        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="font-semibold text-ink">
            {grid.outputLabel}: {layout.vmin?.toExponential(2)} &ndash; {layout.vmax?.toExponential(2)}
          </span>
          {hover && (
            <span className="font-mono text-muted">
              {grid.xLabel}: {hover.xPercent.toFixed(0)}% &middot; {grid.yLabel}:{' '}
              {hover.yPercent.toFixed(0)}% &middot; {grid.outputLabel}: {hover.value?.toExponential(3)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default IsoplethChart
