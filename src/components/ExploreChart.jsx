import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { Check, BarChart3 } from 'lucide-react'
import { useClickOutside } from '../hooks/useClickOutside'
import { getSpeciesDisplayName } from './Plots/speciesFormat'

// Same palette SimulationChart uses, so a species reads the same color on both charts.
const COLORS = [
  '#0057C2', '#FAA119', '#00A2B4', '#00357A', '#D9B915', '#34E1F4', '#C97F10', '#42C0FF',
  '#007483', '#011837', '#7A5C00', '#1E90D8', '#B36A0E', '#4FD1DE', '#FFDD31', '#5A6B7D',
]

const MIN_VALUE = 1e-20
const SPECIES_CHIP_VISIBLE = 20
const CHART_HEIGHT = 500
const PAD_LEFT = 64
const PAD_RIGHT = 16
const PAD_TOP = 14
const PAD_BOTTOM = 34

function niceExponent(value) {
  if (value === 0 || !Number.isFinite(value)) return '0'
  return value.toExponential(0)
}

/**
 * ExploreChart Component
 * A species-concentration line chart drawn directly on canvas instead of through Recharts.
 *
 * Explore re-runs the simulation on every slider drag, so this chart redraws far more often
 * than a normal "run once, look at the result" plot -- profiling showed Recharts (plus React's
 * own prop-diffing of its component tree) costing ~250-300ms per update for a few thousand
 * points, versus a few milliseconds to draw the same data as canvas paths. The species picker,
 * legend, and tooltip below are still plain React -- only the actual line drawing bypasses it.
 */
export function ExploreChart({ results }) {
  const allSpecies = useMemo(() => getRawSpeciesKeys(results), [results])
  const speciesSignature = allSpecies.join('|')

  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [overflowOpen, setOverflowOpen] = useState(false)
  const overflowRef = useRef(null)
  useClickOutside(overflowRef, useCallback(() => setOverflowOpen(false), []), overflowOpen)

  // Select every species by default, and again whenever the mechanism (and so its species
  // list) changes -- keyed off a stable string signature rather than `allSpecies` itself,
  // which is a new array reference on every results update.
  useEffect(() => {
    setSelected(new Set(allSpecies))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speciesSignature])

  const toggleSpecies = (name) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const displaySpecies = useMemo(
    () => allSpecies.filter((name) => selected?.has(name)),
    [allSpecies, selected]
  )

  const filteredForPicker = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return allSpecies
    return allSpecies.filter((name) => getSpeciesDisplayName(name).toLowerCase().startsWith(term))
  }, [allSpecies, search])

  const visiblePickerSpecies = filteredForPicker.slice(0, SPECIES_CHIP_VISIBLE)
  const overflowPickerSpecies = filteredForPicker.slice(SPECIES_CHIP_VISIBLE)
  const allSelected = allSpecies.length > 0 && allSpecies.every((name) => selected?.has(name))

  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const layoutRef = useRef(null)
  const [hover, setHover] = useState(null)

  // Plain arrays per species -- cheap to build (a couple of Array.map calls), unlike Recharts'
  // per-point object construction and React's diffing of that.
  const seriesData = useMemo(() => {
    if (!Array.isArray(results) || results.length === 0) return null
    const times = results.map((point) => point?.time ?? 0)
    const series = {}
    for (const name of displaySpecies) {
      series[name] = results.map((point) => {
        const value = point?.concentrations?.[name]
        return typeof value === 'number' && Number.isFinite(value) && value > MIN_VALUE
          ? value
          : MIN_VALUE
      })
    }
    return { times, series }
  }, [results, displaySpecies])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const width = Math.max(rect.width, 1)
    const height = Math.max(rect.height, 1)
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    if (!seriesData || seriesData.times.length === 0 || displaySpecies.length === 0) {
      layoutRef.current = null
      return
    }

    const { times, series } = seriesData
    const minTime = times[0]
    const maxTime = times[times.length - 1]

    let dataMin = Infinity
    let dataMax = -Infinity
    for (const name of displaySpecies) {
      for (const value of series[name]) {
        if (value < dataMin) dataMin = value
        if (value > dataMax) dataMax = value
      }
    }
    if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax)) {
      dataMin = MIN_VALUE
      dataMax = 1
    }
    const yMin = Math.log10(dataMin > 0 ? dataMin / 10 : MIN_VALUE)
    const yMax = Math.log10(dataMax * 10)
    const ySpan = yMax - yMin || 1
    const xSpan = maxTime - minTime || 1

    const plotLeft = PAD_LEFT
    const plotTop = PAD_TOP
    const plotWidth = width - PAD_LEFT - PAD_RIGHT
    const plotHeight = height - PAD_TOP - PAD_BOTTOM

    const xScale = (t) => plotLeft + ((t - minTime) / xSpan) * plotWidth
    const yScale = (v) => plotTop + plotHeight - ((Math.log10(v) - yMin) / ySpan) * plotHeight

    layoutRef.current = { plotLeft, plotWidth, minTime, maxTime, times }

    // Gridlines + Y ticks
    ctx.strokeStyle = '#D8D6D2'
    ctx.fillStyle = '#5f6368'
    ctx.font = '11px Poppins, sans-serif'
    ctx.lineWidth = 1
    const yTickCount = 5
    for (let i = 0; i <= yTickCount; i++) {
      const frac = i / yTickCount
      const logValue = yMin + frac * ySpan
      const y = plotTop + plotHeight - frac * plotHeight
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(plotLeft, y)
      ctx.lineTo(width - PAD_RIGHT, y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(niceExponent(Math.pow(10, logValue)), plotLeft - 8, y)
    }

    // X ticks
    const xTickCount = 5
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let i = 0; i <= xTickCount; i++) {
      const frac = i / xTickCount
      const t = minTime + frac * xSpan
      ctx.fillText(Math.round(t).toLocaleString(), xScale(t), plotTop + plotHeight + 8)
    }
    ctx.fillStyle = '#1f2937'
    ctx.font = 'bold 12px Poppins, sans-serif'
    ctx.fillText('Time (seconds)', plotLeft + plotWidth / 2, plotTop + plotHeight + 22)

    ctx.save()
    ctx.translate(16, plotTop + plotHeight / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Concentration (mol m⁻³)', 0, 0)
    ctx.restore()

    // Axis lines
    ctx.strokeStyle = '#5f6368'
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(plotLeft, plotTop)
    ctx.lineTo(plotLeft, plotTop + plotHeight)
    ctx.lineTo(width - PAD_RIGHT, plotTop + plotHeight)
    ctx.stroke()

    // Species lines
    displaySpecies.forEach((name) => {
      const color = COLORS[allSpecies.indexOf(name) % COLORS.length]
      const values = series[name]
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < times.length; i++) {
        const x = xScale(times[i])
        const y = yScale(values[i])
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    })
  }, [seriesData, displaySpecies, allSpecies])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => draw())
    observer.observe(container)
    return () => observer.disconnect()
  }, [draw])

  const handleMouseMove = (event) => {
    const layout = layoutRef.current
    if (!layout || !seriesData) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const frac = Math.min(1, Math.max(0, (x - layout.plotLeft) / layout.plotWidth))
    const time = layout.minTime + frac * (layout.maxTime - layout.minTime)

    let nearestIndex = 0
    let nearestDiff = Infinity
    for (let i = 0; i < layout.times.length; i++) {
      const diff = Math.abs(layout.times[i] - time)
      if (diff < nearestDiff) {
        nearestDiff = diff
        nearestIndex = i
      }
    }

    const entries = displaySpecies
      .map((name) => ({
        name,
        color: COLORS[allSpecies.indexOf(name) % COLORS.length],
        value: seriesData.series[name][nearestIndex],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)

    setHover({ x, time: layout.times[nearestIndex], entries })
  }

  if (!Array.isArray(results) || results.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-muted">
            <div className="flex justify-center mb-2">
              <BarChart3 className="w-12 h-12" />
            </div>
            <p>No simulation data to display</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="rounded-lg p-2 sm:p-3 bg-surface-alt">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() =>
                setSelected(allSelected ? new Set() : new Set(filteredForPicker))
              }
              className="text-xs font-bold text-action hover:underline flex-shrink-0"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search species"
              className="flex-1 min-w-[8rem] h-7 px-2 border border-border rounded text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-action"
            />
            <span className="text-xs text-muted flex-shrink-0">
              {displaySpecies.length} selected
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {visiblePickerSpecies.map((name) => {
              const isOn = selected?.has(name)
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleSpecies(name)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                    isOn ? 'text-white' : 'bg-white text-muted border border-border hover:bg-surface-hover'
                  }`}
                  style={isOn ? { backgroundColor: COLORS[allSpecies.indexOf(name) % COLORS.length] } : {}}
                >
                  {getSpeciesDisplayName(name)}
                </button>
              )
            })}

            {overflowPickerSpecies.length > 0 && (
              <div className="relative" ref={overflowRef}>
                <button
                  type="button"
                  onClick={() => setOverflowOpen((open) => !open)}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-white text-muted border border-border hover:bg-surface-hover"
                >
                  +{overflowPickerSpecies.length} others
                </button>
                {overflowOpen && (
                  <div className="absolute z-20 mt-1 w-56 max-h-64 overflow-y-auto bg-white border border-border rounded-lg shadow-lg py-1">
                    {overflowPickerSpecies.map((name) => {
                      const isOn = selected?.has(name)
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleSpecies(name)}
                          className="w-full flex items-center gap-2 text-left text-xs px-3 py-1.5 text-ink hover:bg-surface-hover"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: isOn
                                ? COLORS[allSpecies.indexOf(name) % COLORS.length]
                                : '#D8D6D2',
                            }}
                          />
                          <span className="flex-1 truncate">{getSpeciesDisplayName(name)}</span>
                          <Check className={`w-3.5 h-3.5 flex-shrink-0 ${isOn ? 'opacity-100' : 'opacity-0'}`} />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative border rounded-lg bg-white overflow-hidden"
          style={{ height: CHART_HEIGHT }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* absolute, not an in-flow block: a canvas's intrinsic pixel size (set in draw()
              below) would otherwise feed back into this container's own measured size --
              growing the canvas, which grows the container, which the ResizeObserver sees and
              grows the canvas again. Taking it out of flow breaks that loop. */}
          <canvas ref={canvasRef} className="absolute inset-0" />

          {hover && hover.entries.length > 0 && (
            <div
              className="absolute top-2 bg-white border-2 border-ink rounded-lg shadow-xl p-2.5 pointer-events-none text-xs"
              style={{
                left: hover.x + 12,
                transform: hover.x > 300 ? 'translateX(calc(-100% - 24px))' : 'none',
              }}
            >
              <p className="font-semibold mb-1 text-ink">
                Time: {hover.time?.toLocaleString()} seconds
              </p>
              <div className="space-y-0.5 max-h-64 overflow-y-auto">
                {hover.entries.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="font-medium text-ink">{getSpeciesDisplayName(entry.name)}:</span>
                    <span className="font-mono text-ink">{entry.value?.toExponential(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {displaySpecies.map((name) => (
            <div key={name} className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <span
                className="w-3 h-1 rounded flex-shrink-0"
                style={{ backgroundColor: COLORS[allSpecies.indexOf(name) % COLORS.length] }}
              />
              {getSpeciesDisplayName(name)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Raw concentration keys (not display-stripped) -- needed to index into each point's
// concentrations map. Every result point in this app is shaped { time, concentrations }.
function getRawSpeciesKeys(results) {
  if (!Array.isArray(results) || results.length === 0) return []
  const first = results[0]
  return first?.concentrations && typeof first.concentrations === 'object'
    ? Object.keys(first.concentrations)
    : []
}

export default ExploreChart
