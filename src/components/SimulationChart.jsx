import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label,
} from 'recharts'
import { BarChart3, Atom, AlertCircle, ChevronDown, Check } from 'lucide-react'
import { Card, CardContent, CardDescription } from './ui/card'
import { getSpeciesDisplayName } from './Plots/speciesFormat'
import { useClickOutside } from '../hooks/useClickOutside'

// X-axis time unit options
const TIME_UNITS = [
  { id: 'seconds', label: 'Seconds', axisLabel: 'Time (s)', suffix: 's', divisor: 1 },
  { id: 'hours', label: 'Hours', axisLabel: 'Time (hr)', suffix: 'hr', divisor: 3600 },
]

// Y-axis concentration unit options
const PLOT_UNITS = [
  { id: 'mol_m3', label: 'mol m-3', axisLabel: 'Concentration (mol m-3)', supported: true },
  { id: 'ppb', label: 'ppb', axisLabel: 'Concentration (ppb)', supported: false },
]

// Round a value up to a human-friendly scale (1, 2, 5, or 10 times a power of 10)
function niceNumber(x) {
  const exponent = Math.floor(Math.log10(x))
  const fraction = x / 10 ** exponent
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return niceFraction * 10 ** exponent
}

// How many items to show before collapsing the rest behind "+N others"
const SPECIES_CHIP_VISIBLE = 15
const LEGEND_VISIBLE_COMPACT = 6
const LEGEND_VISIBLE = 10
const TOOLTIP_VISIBLE_COMPACT = 4
const TOOLTIP_VISIBLE = 6

// Legend entries, capped with an "+N others" overlay for the rest (informational only)
function ChartLegendContent({ payload, maxVisible, compact }) {
  const [open, setOpen] = useState(false)
  const overflowRef = useRef(null)
  const closeOverflow = useCallback(() => setOpen(false), [])
  useClickOutside(overflowRef, closeOverflow, open)

  if (!payload || payload.length === 0) return null

  const visible = payload.slice(0, maxVisible)
  const overflow = payload.slice(maxVisible)
  const itemClass = `flex items-center gap-1.5 px-2 py-0.5 bg-white border rounded-lg shadow-sm ${
    compact ? 'text-[10px]' : 'text-xs'
  }`

  return (
    <div className="flex flex-wrap justify-center items-center gap-1.5 px-4">
      {visible.map((entry, index) => (
        <div key={`legend-${index}`} className={itemClass} style={{ borderColor: entry.color }}>
          <div className="w-3 h-1 rounded flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="font-semibold text-gray-900">{entry.value}</span>
        </div>
      ))}
      {overflow.length > 0 && (
        <div className="relative" ref={overflowRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`${itemClass} font-semibold text-gray-700 hover:bg-gray-50`}
            style={{ borderColor: '#d1d5db' }}
          >
            +{overflow.length} others
          </button>
          {open && (
            <div className="absolute z-20 bottom-full mb-1 left-1/2 -translate-x-1/2 w-56 max-h-64 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg py-1">
              {overflow.map((entry, index) => (
                <div
                  key={`legend-overflow-${index}`}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-900"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="truncate">{entry.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Tooltip entries, sorted by value and capped with a plain "+N more" note
// (no click target here since a hover tooltip vanishes on mouse-out)
function ChartTooltipContent({ active, payload, timeLabel, maxVisible, compact }) {
  if (!active || !payload?.length) return null

  const sorted = [...payload].sort((a, b) => {
    const av = typeof a.value === 'number' ? a.value : parseFloat(a.value)
    const bv = typeof b.value === 'number' ? b.value : parseFloat(b.value)
    return (isFinite(bv) ? bv : -Infinity) - (isFinite(av) ? av : -Infinity)
  })
  const visible = sorted.slice(0, maxVisible)
  const overflowCount = sorted.length - visible.length

  return (
    <div
      className={`bg-white border-2 border-gray-800 rounded-lg shadow-xl ${compact ? 'p-2' : 'p-3'}`}
      style={{ backgroundColor: 'white' }}
    >
      <p
        className={`font-semibold text-gray-900 ${compact ? 'mb-1 text-xs' : 'mb-2 text-sm'}`}
        style={{ color: '#111827' }}
      >
        Time: {timeLabel}
      </p>
      <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
        {visible.map((entry, idx) => {
          const numValue =
            typeof entry.value === 'number' ? entry.value : parseFloat(entry.value)
          const isValidNumber = !isNaN(numValue) && isFinite(numValue)

          return (
            <div
              key={idx}
              className={`flex items-center text-xs ${compact ? 'gap-1.5' : 'gap-2'}`}
              style={{ color: '#1f2937' }}
            >
              <div
                className={`${compact ? 'w-2 h-2' : 'w-3 h-3'} rounded-full flex-shrink-0`}
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-medium text-gray-900" style={{ color: '#111827' }}>
                {entry.name}:
              </span>
              <span className="font-mono text-gray-900" style={{ color: '#111827' }}>
                {isValidNumber
                  ? numValue < 1e-19
                    ? compact
                      ? '0.00e+00'
                      : '0.0000e+00'
                    : numValue.toExponential(compact ? 2 : 4)
                  : 'N/A'}
              </span>
            </div>
          )
        })}
        {overflowCount > 0 && (
          <p className="text-[11px] text-gray-500 italic pt-0.5">+{overflowCount} more species</p>
        )}
      </div>
    </div>
  )
}

/**
 * SimulationChart Component
 * Displays atmospheric chemistry concentration data with interactive controls
 *
 * @param {Object} props
 * @param {Array} props.results - Simulation results array with time and concentrations
 * @param {Object} props.metadata - Simulation metadata (mechanism, duration, etc.)
 */
export function SimulationChart({ results, metadata }) {
  const [speciesSearch, setSpeciesSearch] = useState('')
  const [selectedSpecies, setSelectedSpecies] = useState([])
  const [initialized, setInitialized] = useState(false)
  const [timeUnitId, setTimeUnitId] = useState('seconds')
  const [plotUnitId, setPlotUnitId] = useState('mol_m3')
  const [plotUnitMenuOpen, setPlotUnitMenuOpen] = useState(false)
  const [timeUnitMenuOpen, setTimeUnitMenuOpen] = useState(false)
  const [selectAllMenuOpen, setSelectAllMenuOpen] = useState(false)
  const [speciesOverflowOpen, setSpeciesOverflowOpen] = useState(false)
  const plotUnitMenuRef = useRef(null)
  const timeUnitMenuRef = useRef(null)
  const selectAllMenuRef = useRef(null)
  const speciesOverflowRef = useRef(null)

  const timeUnit = TIME_UNITS.find((u) => u.id === timeUnitId) ?? TIME_UNITS[0]
  const plotUnit = PLOT_UNITS.find((u) => u.id === plotUnitId) ?? PLOT_UNITS[0]

  const closePlotUnitMenu = useCallback(() => setPlotUnitMenuOpen(false), [])
  const closeTimeUnitMenu = useCallback(() => setTimeUnitMenuOpen(false), [])
  const closeSelectAllMenu = useCallback(() => setSelectAllMenuOpen(false), [])
  const closeSpeciesOverflow = useCallback(() => setSpeciesOverflowOpen(false), [])
  useClickOutside(plotUnitMenuRef, closePlotUnitMenu, plotUnitMenuOpen)
  useClickOutside(timeUnitMenuRef, closeTimeUnitMenu, timeUnitMenuOpen)
  useClickOutside(selectAllMenuRef, closeSelectAllMenu, selectAllMenuOpen)
  useClickOutside(speciesOverflowRef, closeSpeciesOverflow, speciesOverflowOpen)

  // Color palette for species
  const colors = [
    '#3b82f6',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#6366f1',
    '#84cc16',
    '#06b6d4',
    '#f43f5e',
    '#a855f7',
    '#22c55e',
    '#eab308',
    '#64748b',
  ]

  // Extract all species, do not filter by value (show even if all zero)
  const allSpecies = useMemo(() => {
    if (!Array.isArray(results) || results.length === 0) return []
    const firstPoint = results[0]
    let speciesNames = []
    if (firstPoint?.concentrations && typeof firstPoint.concentrations === 'object') {
      speciesNames = Object.keys(firstPoint.concentrations)
    } else {
      speciesNames = Object.keys(firstPoint).filter(
        (key) => key !== 'time' && key !== 'timestamp' && key !== 'date' && key !== 'concentrations'
      )
    }
    return speciesNames
  }, [results])

  // Reset initialization when results change
  useEffect(() => {
    setInitialized(false)
    setSelectedSpecies([])
  }, [results])

  // Select all species by default
  useEffect(() => {
    if (!initialized && allSpecies.length > 0 && selectedSpecies.length === 0) {
      setSelectedSpecies(allSpecies)
      setInitialized(true)
    }
  }, [allSpecies, results, selectedSpecies.length, initialized])

  // Format data for chart
  const chartData = useMemo(() => {
    if (!Array.isArray(results) || results.length === 0) return []

    const MIN_VALUE = 1e-20

    return results.map((result) => {
      const time = result.time ?? result.timestamp ?? result.date ?? 0
      const point = {
        timeSeconds: time / timeUnit.divisor,
      }

      const source =
        result?.concentrations && typeof result.concentrations === 'object'
          ? result.concentrations
          : result

      allSpecies.forEach((species) => {
        let value = source[species]

        // CRITICAL FIX: MICM returns arrays (for multi-cell support), extract first element
        if (Array.isArray(value)) {
          value = value[0]
        }

        if (typeof value !== 'number' || !isFinite(value)) {
          value = MIN_VALUE
        }

        // For log scale, replace zeros with MIN_VALUE
        point[species] = value < MIN_VALUE ? MIN_VALUE : value
      })

      return point
    })
  }, [results, allSpecies, timeUnit.divisor])

  // Keep axis bounds visually consistent across time units.
  // Recharts' "auto" domain varies padding based on magnitude.

  const timeDomain = useMemo(() => {
    const times = chartData.map((point) => point.timeSeconds).filter((t) => isFinite(t))
    if (times.length === 0) return [0, 1]

    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    if (minTime === maxTime) return [Math.max(0, minTime - 1), maxTime + 1]

    const padding = (maxTime - minTime) * 0.05
    return [Math.max(0, minTime - padding), maxTime + padding]
  }, [chartData])

  // Use a reader-friendly step (in 0.5-hour increments) for gridlines.
  const HOUR_TICK_STEP = 0.5
  const TARGET_HOUR_TICKS = 5
  const xAxisTicks = useMemo(() => {
    if (timeUnit.id !== 'hours') return undefined

    const maxDomain = timeDomain[1]
    if (maxDomain <= 0) return [0]

    const rawStep = maxDomain / TARGET_HOUR_TICKS
    const step = Math.ceil(niceNumber(rawStep) / HOUR_TICK_STEP) * HOUR_TICK_STEP

    const ticks = []
    for (let t = 0; t <= maxDomain + 1e-9; t += step) {
      ticks.push(Math.round(t * 1000) / 1000)
    }
    return ticks
  }, [timeUnit.id, timeDomain])

  // Toggle species selection
  const toggleSpecies = (species) => {
    setSelectedSpecies((prev) =>
      prev.includes(species) ? prev.filter((s) => s !== species) : [...prev, species]
    )
  }

  const displaySpecies = selectedSpecies

  // Filter and sort species for the filter UI
  const filteredSpecies = useMemo(() => {
    const search = speciesSearch.trim().toLowerCase()
    if (!search) return allSpecies
    return allSpecies
      .filter((sp) => getSpeciesDisplayName(sp).toLowerCase().includes(search))
      .sort((a, b) => {
        const aExact = getSpeciesDisplayName(a).toLowerCase() === search
        const bExact = getSpeciesDisplayName(b).toLowerCase() === search
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        return 0
      })
  }, [allSpecies, speciesSearch])

  const visibleFilteredSpecies = filteredSpecies.slice(0, SPECIES_CHIP_VISIBLE)
  const overflowFilteredSpecies = filteredSpecies.slice(SPECIES_CHIP_VISIBLE)

  const allFilteredSelected =
    filteredSpecies.length > 0 && filteredSpecies.every((sp) => displaySpecies.includes(sp))
  const noneSelected = displaySpecies.length === 0
  const selectAllStatusLabel = allFilteredSelected
    ? 'Select all'
    : noneSelected
      ? 'Deselect all'
      : 'Custom'

  // Validation checks
  if (!results || results.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-gray-500">
            <div className="flex justify-center mb-2">
              <BarChart3 className="w-16 h-16" />
            </div>
            <p>No simulation data to display</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (allSpecies.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-gray-500">
            <div className="flex justify-center mb-2">
              <Atom className="w-16 h-16" />
            </div>
            <p>No species found in simulation results</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📉</div>
            <p>Unable to process chart data</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="space-y-3 xs:space-y-4">
        {/* Warning for insufficient data points */}
        {results.length < 3 && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 text-sm">
            <p className="font-semibold text-yellow-800 mb-1 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Limited Data Points
            </p>
            <p className="text-yellow-700 text-xs">
              This simulation produced only {results.length} data point
              {results.length > 1 ? 's' : ''}. For better visualization, consider increasing the
              simulation duration or decreasing the time step.
            </p>
          </div>
        )}

        {/* Species Filter */}
        <div className="rounded-lg p-2 xs:p-3 sm:p-4 bg-gray-50 mt-2 xs:mt-3 sm:mt-4">
          <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 xs:gap-0 mb-3">
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="flex items-center border border-gray-300 rounded-lg divide-x divide-gray-300 bg-white">
                <div className="relative" ref={selectAllMenuRef}>
                  <button
                    type="button"
                    onClick={() => setSelectAllMenuOpen((open) => !open)}
                    className="flex items-center justify-between gap-1 w-32 h-8 text-gray-800 rounded-l-lg text-xs font-bold px-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {selectAllStatusLabel}
                    <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                  </button>

                  {selectAllMenuOpen && (
                    <div className="absolute z-10 mt-1 min-w-[9rem] bg-white border border-gray-300 rounded-lg shadow-lg py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSpecies(filteredSpecies)
                          setSelectAllMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-2 text-left text-xs font-bold px-3 py-1.5 text-gray-800 hover:bg-gray-100"
                      >
                        <Check
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            allFilteredSelected ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSpecies([])
                          setSelectAllMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-2 text-left text-xs font-bold px-3 py-1.5 text-gray-800 hover:bg-gray-100"
                      >
                        <Check
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            noneSelected ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        Deselect all
                      </button>
                    </div>
                  )}
                </div>

                {/* Search bar for species filter */}
                <input
                  type="text"
                  value={speciesSearch}
                  onChange={(e) => {
                    setSpeciesSearch(e.target.value)
                    setSpeciesOverflowOpen(false)
                  }}
                  placeholder="Search species"
                  className="w-[30rem] h-8 px-3 text-gray-800 placeholder:text-gray-400 rounded-r-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center border border-gray-300 rounded-lg divide-x divide-gray-300 bg-white">
                <div className="relative" ref={plotUnitMenuRef}>
                  <button
                    type="button"
                    onClick={() => setPlotUnitMenuOpen((open) => !open)}
                    className="flex items-center justify-between gap-1 w-24 h-8 text-gray-800 rounded-l-lg text-xs font-bold px-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {plotUnit.label}
                    <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                  </button>

                  {plotUnitMenuOpen && (
                    <div className="absolute z-10 mt-1 min-w-[9rem] bg-white border border-gray-300 rounded-lg shadow-lg py-1">
                      {PLOT_UNITS.map((unit) => (
                        <button
                          key={unit.id}
                          type="button"
                          disabled={!unit.supported}
                          title={!unit.supported ? 'Conversion not yet supported' : undefined}
                          onClick={() => {
                            setPlotUnitId(unit.id)
                            setPlotUnitMenuOpen(false)
                          }}
                          className={`w-full flex items-center gap-2 text-left text-xs font-bold px-3 py-1.5 ${
                            unit.supported
                              ? 'text-gray-800 hover:bg-gray-100'
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <Check
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              plotUnitId === unit.id ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                          {unit.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative" ref={timeUnitMenuRef}>
                  <button
                    type="button"
                    onClick={() => setTimeUnitMenuOpen((open) => !open)}
                    className="flex items-center justify-between gap-1 w-24 h-8 text-gray-800 rounded-r-lg text-xs font-bold px-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {timeUnit.label}
                    <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                  </button>

                  {timeUnitMenuOpen && (
                    <div className="absolute z-10 mt-1 min-w-[9rem] bg-white border border-gray-300 rounded-lg shadow-lg py-1">
                      {TIME_UNITS.map((unit) => (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => {
                            setTimeUnitId(unit.id)
                            setTimeUnitMenuOpen(false)
                          }}
                          className="w-full flex items-center gap-2 text-left text-xs font-bold px-3 py-1.5 text-gray-800 hover:bg-gray-100"
                        >
                          <Check
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              timeUnitId === unit.id ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                          {unit.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 xs:gap-2 pl-2">
            <h4 className="font-semibold text-xs xs:text-sm text-gray-500 mr-1">
              {displaySpecies.length} selected
            </h4>
            {visibleFilteredSpecies.map((species) => (
              <button
                key={species}
                onClick={() => toggleSpecies(species)}
                className={`px-2 xs:px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  displaySpecies.includes(species)
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                style={
                  displaySpecies.includes(species)
                    ? { backgroundColor: colors[allSpecies.indexOf(species) % colors.length] }
                    : {}
                }
              >
                {getSpeciesDisplayName(species)}
              </button>
            ))}
            {overflowFilteredSpecies.length > 0 && (
              <div className="relative" ref={speciesOverflowRef}>
                <button
                  type="button"
                  onClick={() => setSpeciesOverflowOpen((open) => !open)}
                  className="px-2 xs:px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-all"
                >
                  +{overflowFilteredSpecies.length} others
                </button>

                {speciesOverflowOpen && (
                  <div className="absolute z-20 mt-1 w-56 max-h-64 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg py-1">
                    {overflowFilteredSpecies.map((species) => (
                      <button
                        key={species}
                        type="button"
                        onClick={() => toggleSpecies(species)}
                        className="w-full flex items-center gap-2 text-left text-xs font-medium px-3 py-1.5 hover:bg-gray-100 text-gray-800"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: displaySpecies.includes(species)
                              ? colors[allSpecies.indexOf(species) % colors.length]
                              : '#d1d5db',
                          }}
                        />
                        <span className="flex-1 truncate">{getSpeciesDisplayName(species)}</span>
                        <Check
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            displaySpecies.includes(species) ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="border rounded-lg p-2 xs:p-3 sm:p-4 bg-white">
          <ResponsiveContainer width="100%" height={450} className="xs:hidden">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

              <XAxis
                dataKey="timeSeconds"
                domain={timeDomain}
                ticks={xAxisTicks}
                stroke="#374151"
                tick={{ fontSize: 10, fill: '#374151' }}
                type="number"
              >
                <Label
                  value={timeUnit.axisLabel}
                  position="insideBottom"
                  offset={-5}
                  style={{ fill: '#1f2937', fontWeight: 600, fontSize: 11 }}
                />
              </XAxis>

              <YAxis
                scale="log"
                domain={[
                  (dataMin) => (dataMin > 0 ? dataMin / 10 : 1e-20),
                  (dataMax) => dataMax * 10,
                ]}
                stroke="#374151"
                tick={{ fontSize: 8, fill: '#374151' }}
                tickFormatter={(value) => {
                  if (value === 0 || !isFinite(value)) return '0'
                  return value.toExponential(0)
                }}
                allowDataOverflow={false}
                width={38}
              />

              <Tooltip
                wrapperStyle={{ zIndex: 10 }}
                content={({ active, payload, label }) => (
                  <ChartTooltipContent
                    active={active}
                    payload={payload}
                    timeLabel={`${
                      timeUnit.divisor === 1 ? label?.toLocaleString() : label?.toFixed(2)
                    } ${timeUnit.suffix}`}
                    maxVisible={TOOLTIP_VISIBLE_COMPACT}
                    compact
                  />
                )}
              />

              <Legend
                wrapperStyle={{ paddingTop: '16px' }}
                content={<ChartLegendContent maxVisible={LEGEND_VISIBLE_COMPACT} compact />}
              />

              {displaySpecies.map((species) => (
                <Line
                  key={species}
                  type="monotone"
                  dataKey={species}
                  stroke={colors[allSpecies.indexOf(species) % colors.length]}
                  strokeWidth={2}
                  dot={results.length <= 10 ? { r: 3 } : false}
                  name={getSpeciesDisplayName(species)}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {/* Larger chart for bigger screens */}
          <ResponsiveContainer width="100%" height={680} className="hidden xs:block">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

              <XAxis
                dataKey="timeSeconds"
                domain={timeDomain}
                ticks={xAxisTicks}
                stroke="#374151"
                tick={{ fontSize: 12, fill: '#374151' }}
                type="number"
              >
                <Label
                  value={timeUnit.axisLabel}
                  position="insideBottom"
                  offset={-5}
                  style={{ fill: '#1f2937', fontWeight: 600, fontSize: 14 }}
                />
              </XAxis>

              <YAxis
                scale="log"
                domain={[
                  (dataMin) => (dataMin > 0 ? dataMin / 10 : 1e-20),
                  (dataMax) => dataMax * 10,
                ]}
                stroke="#374151"
                tick={{ fontSize: 11, fill: '#374151' }}
                tickFormatter={(value) => {
                  if (value === 0 || !isFinite(value)) return '0'
                  return value.toExponential(0)
                }}
                allowDataOverflow={false}
                width={70}
              >
                <Label
                  value={plotUnit.axisLabel}
                  angle={-90}
                  position="insideLeft"
                  offset={10}
                  style={{ fill: '#1f2937', fontWeight: 600, fontSize: 13, textAnchor: 'middle' }}
                />
              </YAxis>

              <Tooltip
                wrapperStyle={{ zIndex: 10 }}
                content={({ active, payload, label }) => (
                  <ChartTooltipContent
                    active={active}
                    payload={payload}
                    timeLabel={`${
                      timeUnit.divisor === 1 ? label?.toLocaleString() : label?.toFixed(2)
                    } ${timeUnit.label.toLowerCase()}`}
                    maxVisible={TOOLTIP_VISIBLE}
                  />
                )}
              />

              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                content={<ChartLegendContent maxVisible={LEGEND_VISIBLE} />}
              />

              {displaySpecies.map((species) => (
                <Line
                  key={species}
                  type="monotone"
                  dataKey={species}
                  stroke={colors[allSpecies.indexOf(species) % colors.length]}
                  strokeWidth={3}
                  dot={results.length <= 10 ? { r: 4 } : false}
                  name={getSpeciesDisplayName(species)}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Box */}
        <div className="text-xs text-gray-600 bg-blue-50/40 border border-blue-200 rounded-lg p-3">
          <p className="font-semibold text-sm mb-1 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Summary:
          </p>
          <CardDescription className="text-sm ml-4">
            • {metadata?.mechanism?.toUpperCase()}
            {metadata?.mechanism &&
              !metadata.mechanism.toLowerCase().includes('mechanism') && (
                <>{"\u00A0"}mechanism</>
              )}
            <br />
            • {metadata?.duration?.toLocaleString()} {"\u00A0"}seconds
            {metadata?.duration != null && (
              <>
                {"\u00A0"}{"\u00A0"}|{"\u00A0"}{"\u00A0"}
                {(metadata.duration / 3600).toFixed(1)} {"\u00A0"}hours
              </>
            )}
            <br />
            • {results.length} {"\u00A0"}data points
          </CardDescription>
        </div>
      </CardContent>
    </Card>
  )
}

export default SimulationChart
