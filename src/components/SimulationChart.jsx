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
import { BarChart3, Atom, AlertCircle, Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { UnitDropdown } from './Plots/UnitDropdown'
import { LIST_CARD, LIST_CARD_CONTENT, TEXT_INPUT_SM } from './Mechanism/fieldStyles'
import { getSpeciesDisplayName } from './Plots/speciesFormat'
import { useClickOutside } from '../hooks/useClickOutside'
import { useResultsConcentrationUnit } from '../hooks/useConcentrationUnit'
import { fromMolM3, isMixingRatioUnit } from '../utils/concentrationUnits'
import { CHART_COLORS } from './chartColors'
import { TIME_RANGE_UNITS as TIME_UNITS } from './Plots/timeRangeUnits'

// Concentrations at or below this (mol m-3) are plotted at the floor, since the y-axis is log.
const MIN_VALUE = 1e-20

const filterButtonClass = (selected) =>
  `w-full text-left text-sm px-1.5 py-1 rounded ${
    selected
      ? 'text-assist-secondary-foreground font-semibold bg-assist-secondary'
      : 'text-muted hover:bg-surface-hover'
  }`

const UNIT_DROPDOWN_WRAPPER = 'relative flex-shrink-0 mr-3'
const UNIT_DROPDOWN_BUTTON =
  'flex items-center gap-1 w-full h-8 px-2 border border-gray-300 rounded-lg text-sm text-gray-800 hover:bg-gray-50 bg-white'

// Round a value up to a human-friendly scale (1, 2, 5, or 10 times a power of 10)
function niceNumber(x) {
  const exponent = Math.floor(Math.log10(x))
  const fraction = x / 10 ** exponent
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return niceFraction * 10 ** exponent
}

// Number of items to show before collapsing the rest into "+N others"
const SPECIES_CHIP_VISIBLE = 25
const LEGEND_VISIBLE_COMPACT = 6
const LEGEND_VISIBLE = 25
const TOOLTIP_VISIBLE_COMPACT = 6
const TOOLTIP_VISIBLE = 25

// Legend entries, with overflow shown in a "+N others" overlay.
export function ChartLegendContent({ payload, maxVisible, compact }) {
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
          <span className="font-semibold text-ink">{entry.value}</span>
        </div>
      ))}
      {overflow.length > 0 && (
        <div className="relative" ref={overflowRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`${itemClass} font-semibold text-muted hover:bg-surface-hover`}
            style={{ borderColor: '#D8D6D2' }}
          >
            +{overflow.length} others
          </button>
          {open && (
            <div className="absolute z-20 bottom-full mb-1 left-1/2 -translate-x-1/2 w-56 max-h-64 overflow-y-auto bg-white border border-border rounded-lg shadow-lg py-1">
              {overflow.map((entry, index) => (
                <div
                  key={`legend-overflow-${index}`}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink"
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

// Tooltip entries sorted by value, with overflow shown as a "+N more" note.
// No interaction since the tooltip disappears on mouse-out.
export function ChartTooltipContent({
  active,
  payload,
  timeLabel,
  maxVisible,
  compact,
  zeroBelow = 1e-19,
}) {
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
      className={`bg-white border-2 border-ink rounded-lg shadow-xl ${compact ? 'p-2' : 'p-3'}`}
      style={{ backgroundColor: 'white' }}
    >
      <p
        className={`text-muted ${compact ? 'mb-1 text-[10px]' : 'mb-2 text-xs'}`}
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
              <span className="font-medium text-ink" style={{ color: '#1f2937' }}>
                {entry.name}:
              </span>
              <span className="font-mono text-ink" style={{ color: '#1f2937' }}>
                {isValidNumber
                  ? numValue < zeroBelow
                    ? '0.0000e+00'
                    : numValue.toExponential(4)
                  : 'N/A'}
              </span>
            </div>
          )
        })}
        {overflowCount > 0 && (
          <p className="text-xs text-muted italic pt-0.5 pl-1">+{overflowCount} more species</p>
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
  const {
    unitId: plotUnitId,
    unit: plotUnit,
    units: plotUnits,
    setUnitId: setPlotUnitId,
    airDensities,
  } = useResultsConcentrationUnit(results)
  const [speciesOverflowOpen, setSpeciesOverflowOpen] = useState(false)
  const speciesOverflowRef = useRef(null)

  const timeUnit = TIME_UNITS.find((u) => u.id === timeUnitId) ?? TIME_UNITS[0]
  const plotUnitAxisLabel = `Concentration (${plotUnit.label})`

  const closeSpeciesOverflow = useCallback(() => setSpeciesOverflowOpen(false), [])
  useClickOutside(speciesOverflowRef, closeSpeciesOverflow, speciesOverflowOpen)

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

    // Mixing ratios scale with the air density at each point's time; mol m-3 needs none.
    const densities = isMixingRatioUnit(plotUnitId) ? airDensities : null

    return results.map((result, index) => {
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
        // Floor in mol m-3 first so lines don't shift when the unit changes.
        if (value < MIN_VALUE) value = MIN_VALUE
        point[species] = densities ? fromMolM3(value, plotUnitId, densities[index]) : value
      })

      return point
    })
  }, [results, allSpecies, timeUnit.divisor, plotUnitId, airDensities])

  // Tooltip shows "0" for points sitting on the floor, whatever unit the floor converts to.
  const zeroBelow = useMemo(() => {
    if (!isMixingRatioUnit(plotUnitId)) return undefined
    const floors = airDensities.map((d) => fromMolM3(MIN_VALUE, plotUnitId, d))
    return floors.length > 0 ? Math.max(...floors) * 1.01 : undefined
  }, [plotUnitId, airDensities])

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
      .filter((sp) => getSpeciesDisplayName(sp).toLowerCase().startsWith(search))
      .sort((a, b) => {
        const aExact = getSpeciesDisplayName(a).toLowerCase() === search
        const bExact = getSpeciesDisplayName(b).toLowerCase() === search
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        return 0
      })
  }, [allSpecies, speciesSearch])

  // Selected species beyond the visible cap stay listed until deselected.
  const baseVisibleSpecies = filteredSpecies.slice(0, SPECIES_CHIP_VISIBLE)
  const overflowCandidates = filteredSpecies.slice(SPECIES_CHIP_VISIBLE)
  const visibleSpeciesList = [
    ...baseVisibleSpecies,
    ...overflowCandidates.filter((sp) => displaySpecies.includes(sp)),
  ]
  const overflowSpeciesList = overflowCandidates.filter((sp) => !displaySpecies.includes(sp))

  // Validation checks
  if (!results || results.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-muted">
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
          <div className="text-center text-muted">
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
          <div className="text-center text-muted">
            <div className="text-4xl mb-2">📉</div>
            <p>Unable to process chart data</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const unitLabelSuffix = metadata?.mechanism
    ? `${metadata.mechanism.toUpperCase()}${
        metadata.mechanism.toLowerCase().includes('mechanism') ? '' : ' mechanism'
      }`
    : null

  return (
    <Card className={LIST_CARD}>
      <CardHeader className="py-4">
        <CardTitle className="text-lg">Species concentration</CardTitle>
        <CardDescription>
          {[
            unitLabelSuffix,
            metadata?.duration != null
              ? `${metadata.duration.toLocaleString()} s | ${(metadata.duration / 3600).toFixed(1)} hr`
              : null,
            `${results.length} data points`,
          ]
            .filter(Boolean)
            .join(' \u2022 ')}
        </CardDescription>
      </CardHeader>
      <CardContent className={LIST_CARD_CONTENT}>
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          {/* Sidebar controls */}
          <div className="w-full lg:w-60 flex-shrink-0 space-y-5 lg:overflow-y-auto">
            <div>
              <p className="text-sm font-semibold text-ink mb-2">Time unit</p>
              <UnitDropdown
                unitId={timeUnitId}
                onChange={setTimeUnitId}
                units={TIME_UNITS}
                wrapperClassName={UNIT_DROPDOWN_WRAPPER}
                buttonClassName={UNIT_DROPDOWN_BUTTON}
                centerLabel
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-ink mb-2">Species</p>
              <UnitDropdown
                unitId={plotUnitId}
                onChange={setPlotUnitId}
                units={plotUnits}
                wrapperClassName={`${UNIT_DROPDOWN_WRAPPER} mb-2`}
                buttonClassName={UNIT_DROPDOWN_BUTTON}
                centerLabel
              />

              <input
                type="text"
                value={speciesSearch}
                onChange={(e) => {
                  setSpeciesSearch(e.target.value)
                  setSpeciesOverflowOpen(false)
                }}
                placeholder="Search by name"
                className={`w-[calc(100%-0.75rem)] block !h-8 mb-2 focus:!border-action ${TEXT_INPUT_SM}`}
              />

              <div className="flex items-center gap-2 mb-2 pl-1">
                <button
                  type="button"
                  onClick={() => setSelectedSpecies(filteredSpecies)}
                  className="text-sm text-action hover:underline"
                >
                  Select all
                </button>
                <span className="text-sm text-muted">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedSpecies([])}
                  className="text-sm text-action hover:underline"
                >
                  Deselect all
                </button>
              </div>

              <div className="flex flex-col gap-0.5">
                {visibleSpeciesList.map((species) => (
                  <button
                    key={species}
                    type="button"
                    onClick={() => toggleSpecies(species)}
                    className={filterButtonClass(displaySpecies.includes(species))}
                  >
                    {getSpeciesDisplayName(species)}
                  </button>
                ))}

                {overflowSpeciesList.length > 0 && (
                  <div className="relative" ref={speciesOverflowRef}>
                    <button
                      type="button"
                      onClick={() => setSpeciesOverflowOpen((open) => !open)}
                      className="text-left text-sm px-1.5 py-1 rounded text-muted hover:bg-surface-hover"
                    >
                      +{overflowSpeciesList.length} others
                    </button>

                    {speciesOverflowOpen && (
                      <div className="absolute z-20 mt-1 w-48 max-h-56 overflow-y-auto bg-white border border-border rounded-lg shadow-lg py-1">
                        {overflowSpeciesList.map((species) => (
                          <button
                            key={species}
                            type="button"
                            onClick={() => toggleSpecies(species)}
                            className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 text-ink hover:bg-surface-hover"
                          >
                            <Check
                              className={`w-3.5 h-3.5 flex-shrink-0 ${
                                displaySpecies.includes(species) ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            <span className="flex-1 truncate">{getSpeciesDisplayName(species)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main content: chart */}
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            {results.length < 3 && (
              <div className="bg-[#FFFBEB] border-2 border-location/60 rounded-lg p-3 text-sm">
                <p className="font-semibold text-heading mb-1 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Limited Data Points
                </p>
                <p className="text-ink text-xs">
                  This simulation produced only {results.length} data point
                  {results.length > 1 ? 's' : ''}. For better visualization, consider increasing
                  the simulation duration or decreasing the time step.
                </p>
              </div>
            )}

            <div className="relative flex-1 min-h-[28rem] lg:min-h-0 bg-white">
              <div className="absolute inset-0 p-2 xs:p-3 sm:p-4 !pl-0">
          <ResponsiveContainer width="100%" height="100%" className="xs:hidden">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D8D6D2" />

              <XAxis
                dataKey="timeSeconds"
                domain={timeDomain}
                ticks={xAxisTicks}
                stroke="#5f6368"
                tick={{ fontSize: 10, fill: '#5f6368' }}
                type="number"
              >
                <Label
                  value={`Time (${timeUnit.shortLabel})`}
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
                stroke="#5f6368"
                tick={{ fontSize: 8, fill: '#5f6368' }}
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
                    } ${timeUnit.shortLabel}`}
                    maxVisible={TOOLTIP_VISIBLE_COMPACT}
                    zeroBelow={zeroBelow}
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
                  stroke={CHART_COLORS[allSpecies.indexOf(species) % CHART_COLORS.length]}
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
          <ResponsiveContainer width="100%" height="100%" className="hidden xs:block">
            <LineChart data={chartData} margin={{ top: 5, right: 0, left: 10, bottom: 3 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D8D6D2" />

              <XAxis
                dataKey="timeSeconds"
                domain={timeDomain}
                ticks={xAxisTicks}
                stroke="#5f6368"
                tick={{ fontSize: 12, fill: '#5f6368' }}
                type="number"
              >
                <Label
                  value={`Time (${timeUnit.shortLabel})`}
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
                stroke="#5f6368"
                tick={{ fontSize: 11, fill: '#5f6368' }}
                tickFormatter={(value) => {
                  if (value === 0 || !isFinite(value)) return '0'
                  return value.toExponential(0)
                }}
                allowDataOverflow={false}
                width={70}
              >
                <Label
                  value={plotUnitAxisLabel}
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
                    } ${timeUnit.shortLabel}`}
                    maxVisible={TOOLTIP_VISIBLE}
                    zeroBelow={zeroBelow}
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
                  stroke={CHART_COLORS[allSpecies.indexOf(species) % CHART_COLORS.length]}
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SimulationChart
