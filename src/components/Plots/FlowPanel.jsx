import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { ChevronDown, Check } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { isRealSpecies } from './flowUtils'
import { getSpeciesDisplayName } from './speciesFormat'

// Show at most this many species as chips before collapsing the rest into a "+N others" menu
const SPECIES_CHIP_VISIBLE = 25

const LAYOUT_OPTIONS = [
  { id: 'force', label: 'Reaction-explicit' },
  { id: 'layered', label: 'Species-only' },
]

const ARROW_SCALING_OPTIONS = [
  { id: 'linear', label: 'Linear' },
  { id: 'logarithmic', label: 'Logarithmic' },
]

const TIME_RANGE_UNITS = [
  { id: 'seconds', label: 'Seconds', divisor: 1 },
  { id: 'hours', label: 'Hours', divisor: 3600 },
]

// Flux is always stored in mol m-3; ppb needs the ideal gas law with per-point
// temperature/pressure to convert, which isn't implemented yet.
const FLUX_DIVISOR = 1

// A number input for one end of a range, displayed/edited in the currently
// selected unit but always committed back in the range's base unit
// (seconds for Time Range, mol m-3 for Flux Range).
// Hides the native up/down stepper across browsers
const NO_SPINNER =
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

function RangeBoundInput({ value, divisor, onCommit, className, decimals }) {
  const rawDisplayValue = value / divisor
  const displayValue = decimals != null ? rawDisplayValue.toFixed(decimals) : rawDisplayValue
  const [draft, setDraft] = useState(String(displayValue))

  useEffect(() => {
    setDraft(String(displayValue))
  }, [displayValue])

  const commit = () => {
    const parsed = parseFloat(draft)
    if (!isNaN(parsed)) onCommit(parsed * divisor)
    else setDraft(String(displayValue))
  }

  return (
    <input
      type="number"
      step="any"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
      }}
      className={`${NO_SPINNER} ${
        className ??
        'w-20 h-8 px-2 bg-white text-gray-900 rounded border text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-600'
      }`}
    />
  )
}

/*
 * FlowPanel Component
 * Creates a control panel that allows for customization of flow visualizations
 * Features include:
 *   - Arrow Width Scaling (linear or logarithmic)
 *   - Time Range selection (seconds or hours)
 *   - Flux Range selection (in mol m-3)
 *   - Species Selection Dropdown
 */

export function FlowPanel({
  arrowScaling,
  setArrowScaling,
  range,
  setRange,
  fluxRange,
  setFluxRange,
  selectedSpecies,
  setSelectedSpecies,
  layoutMode,
  setLayoutMode,
}) {
  // Source the species list from actual simulation output (like the Species tab),
  // not the full mechanism config — the config can declare species the solver
  // never reports, and the graph only ever renders real, non-tracer species.
  const results = useSelector((state) => state.simulation.results)
  const speciesNames = useMemo(() => {
    if (!Array.isArray(results) || results.length === 0) return []
    const firstPoint = results[0]
    const keys =
      firstPoint?.concentrations && typeof firstPoint.concentrations === 'object'
        ? Object.keys(firstPoint.concentrations)
        : Object.keys(firstPoint).filter(
            (key) => key !== 'time' && key !== 'timestamp' && key !== 'date' && key !== 'concentrations'
          )
    // Concentration keys are raw solver output ("CONC.<SPECIES>.mol m-3"); the
    // graph matches selections against bare species names (rxn.reactants[i]['species name']).
    return keys.map(getSpeciesDisplayName).filter(isRealSpecies)
  }, [results])
  const displaySpecies = selectedSpecies || []

  const [initialized, setInitialized] = useState(false)

  // Select all species by default
  useEffect(() => {
    if (!initialized && speciesNames.length > 0 && displaySpecies.length === 0) {
      setSelectedSpecies(speciesNames)
      setInitialized(true)
    }
  }, [speciesNames, displaySpecies.length, initialized, setSelectedSpecies])

  const [speciesSearch, setSpeciesSearch] = useState('')
  const [selectAllMenuOpen, setSelectAllMenuOpen] = useState(false)
  const [speciesOverflowOpen, setSpeciesOverflowOpen] = useState(false)
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false)
  const [arrowScalingMenuOpen, setArrowScalingMenuOpen] = useState(false)
  const [timeRangeUnitId, setTimeRangeUnitId] = useState('seconds')
  const [timeRangeUnitMenuOpen, setTimeRangeUnitMenuOpen] = useState(false)
  const selectAllMenuRef = useRef(null)
  const speciesOverflowRef = useRef(null)
  const layoutMenuRef = useRef(null)
  const arrowScalingMenuRef = useRef(null)
  const timeRangeUnitMenuRef = useRef(null)
  const closeSelectAllMenu = useCallback(() => setSelectAllMenuOpen(false), [])
  const closeSpeciesOverflow = useCallback(() => setSpeciesOverflowOpen(false), [])
  const closeLayoutMenu = useCallback(() => setLayoutMenuOpen(false), [])
  const closeArrowScalingMenu = useCallback(() => setArrowScalingMenuOpen(false), [])
  const closeTimeRangeUnitMenu = useCallback(() => setTimeRangeUnitMenuOpen(false), [])
  useClickOutside(selectAllMenuRef, closeSelectAllMenu, selectAllMenuOpen)
  useClickOutside(speciesOverflowRef, closeSpeciesOverflow, speciesOverflowOpen)
  useClickOutside(layoutMenuRef, closeLayoutMenu, layoutMenuOpen)
  useClickOutside(arrowScalingMenuRef, closeArrowScalingMenu, arrowScalingMenuOpen)
  useClickOutside(timeRangeUnitMenuRef, closeTimeRangeUnitMenu, timeRangeUnitMenuOpen)

  const timeRangeUnit = TIME_RANGE_UNITS.find((u) => u.id === timeRangeUnitId) ?? TIME_RANGE_UNITS[0]

  const layoutOption = LAYOUT_OPTIONS.find((o) => o.id === layoutMode) ?? LAYOUT_OPTIONS[0]
  const arrowScalingOption =
    ARROW_SCALING_OPTIONS.find((o) => o.id === arrowScaling) ?? ARROW_SCALING_OPTIONS[0]

  const toggleSpecies = (name) => {
    setSelectedSpecies(
      displaySpecies.includes(name)
        ? displaySpecies.filter((n) => n !== name)
        : [...displaySpecies, name]
    )
  }

  // Filter and sort species for the search box (exact match first)
  const filteredSpecies = useMemo(() => {
    const search = speciesSearch.trim().toLowerCase()
    if (!search) return speciesNames
    return speciesNames
      .filter((name) => name.toLowerCase().startsWith(search))
      .sort((a, b) => {
        const aExact = a.toLowerCase() === search
        const bExact = b.toLowerCase() === search
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        return 0
      })
  }, [speciesNames, speciesSearch])

  const visibleFilteredSpecies = filteredSpecies.slice(0, SPECIES_CHIP_VISIBLE)
  const overflowFilteredSpecies = filteredSpecies.slice(SPECIES_CHIP_VISIBLE)

  const allFilteredSelected =
    filteredSpecies.length > 0 && filteredSpecies.every((name) => displaySpecies.includes(name))
  const noneSelected = displaySpecies.length === 0
  const selectAllStatusLabel = allFilteredSelected
    ? 'Select all'
    : noneSelected
      ? 'Deselect all'
      : 'Custom'

  return (
    <div className="flex flex-wrap items-start gap-3 p-2 xs:p-3 sm:p-4 w-full rounded-lg bg-gray-50 text-gray-900 mt-2 xs:mt-3 sm:mt-4">
      {/* Row 1: Layout | Arrow Scaling | Time Range | Flux Range */}
      <div className="flex flex-wrap items-center gap-3 w-full text-sm font-semibold">
        <div className="relative" ref={layoutMenuRef}>
            <button
              type="button"
              onClick={() => setLayoutMenuOpen((open) => !open)}
              className="flex items-center justify-between gap-1 w-44 h-8 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm font-bold px-2.5 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {layoutOption.label}
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>

            {layoutMenuOpen && (
              <div className="absolute z-10 mt-1 min-w-[12rem] bg-white border border-gray-300 rounded-lg shadow-lg py-1">
                {LAYOUT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setLayoutMode(option.id)
                      setLayoutMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 text-left text-sm font-bold px-3 py-1.5 text-gray-800 hover:bg-gray-100 whitespace-nowrap"
                  >
                    <Check
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        layoutMode === option.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={arrowScalingMenuRef}>
            <button
              type="button"
              onClick={() => setArrowScalingMenuOpen((open) => !open)}
              className="flex items-center justify-between gap-1 w-32 h-8 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm font-bold px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <span className="pr-2">{arrowScalingOption.label}</span>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>

            {arrowScalingMenuOpen && (
              <div className="absolute z-10 mt-1 min-w-[9rem] bg-white border border-gray-300 rounded-lg shadow-lg py-1">
                {ARROW_SCALING_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setArrowScaling(option.id)
                      setArrowScalingMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 text-left text-sm font-bold px-3 py-1.5 text-gray-800 hover:bg-gray-100"
                  >
                    <Check
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        arrowScaling === option.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

        {/* Time Range */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-300 rounded-lg bg-white">
            <div className="relative border-r border-gray-300" ref={timeRangeUnitMenuRef}>
              <button
                type="button"
                onClick={() => setTimeRangeUnitMenuOpen((open) => !open)}
                className="flex items-center justify-between gap-1 w-24 h-8 bg-white text-gray-900 rounded-l-lg text-sm font-bold px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {timeRangeUnit.label}
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
              </button>

              {timeRangeUnitMenuOpen && (
                <div className="absolute z-10 mt-1 min-w-[8rem] bg-white border border-gray-300 rounded-lg shadow-lg py-1">
                  {TIME_RANGE_UNITS.map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => {
                        setTimeRangeUnitId(unit.id)
                        setTimeRangeUnitMenuOpen(false)
                      }}
                      className="w-full flex items-center gap-2 text-left text-sm font-bold px-3 py-1.5 text-gray-800 hover:bg-gray-100"
                    >
                      <Check
                        className={`w-3.5 h-3.5 flex-shrink-0 ${
                          timeRangeUnitId === unit.id ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      {unit.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <RangeBoundInput
              value={range.start}
              divisor={timeRangeUnit.divisor}
              onCommit={(start) => setRange({ start, end: range.end })}
              className="w-20 h-8 px-2 bg-white text-gray-900 text-sm text-center focus:outline-none focus:relative focus:z-10 focus:ring-2 focus:ring-blue-600"
            />

            <span className="flex items-center justify-center h-8 px-2 text-gray-500 font-normal bg-white">
              -
            </span>

            <RangeBoundInput
              value={range.end}
              divisor={timeRangeUnit.divisor}
              onCommit={(end) => setRange({ start: range.start, end })}
              className="w-20 h-8 px-2 bg-white text-gray-900 rounded-r-lg text-sm text-center focus:outline-none focus:relative focus:z-10 focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Flux Range */}
        <div className="flex items-center gap-2">
          <span>Flux (mol m-3)</span>

          <div className="flex items-center border border-gray-300 rounded-lg bg-white">
            <RangeBoundInput
              value={fluxRange.start}
              divisor={FLUX_DIVISOR}
              decimals={6}
              onCommit={(start) => setFluxRange({ start, end: fluxRange.end })}
              className="w-28 h-8 px-2 bg-white text-gray-900 rounded-l-lg text-sm text-center focus:outline-none focus:relative focus:z-10 focus:ring-2 focus:ring-blue-600"
            />

            <span className="flex items-center justify-center h-8 px-2 text-gray-500 font-normal bg-white">
              -
            </span>

            <RangeBoundInput
              value={fluxRange.end}
              divisor={FLUX_DIVISOR}
              decimals={6}
              onCommit={(end) => setFluxRange({ start: fluxRange.start, end })}
              className="w-28 h-8 px-2 bg-white text-gray-900 rounded-r-lg text-sm text-center focus:outline-none focus:relative focus:z-10 focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Row 2: Select All / Deselect All + Search */}
      <div className="w-full flex">
      <div className="flex items-center border border-gray-300 rounded-lg divide-x divide-gray-300 bg-white">
        <div className="relative" ref={selectAllMenuRef}>
          <button
            type="button"
            onClick={() => setSelectAllMenuOpen((open) => !open)}
            className="flex items-center justify-between gap-1 w-32 h-8 bg-white text-gray-900 rounded-l-lg text-sm font-bold px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                className="w-full flex items-center gap-2 text-left text-sm font-bold px-3 py-1.5 text-gray-800 hover:bg-gray-100"
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
                className="w-full flex items-center gap-2 text-left text-sm font-bold px-3 py-1.5 text-gray-800 hover:bg-gray-100"
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

        <input
          type="text"
          value={speciesSearch}
          onChange={(e) => {
            setSpeciesSearch(e.target.value)
            setSpeciesOverflowOpen(false)
          }}
          placeholder="Search species"
          className="w-[30rem] h-8 px-3 bg-white text-gray-800 placeholder:text-gray-400 rounded-r-lg text-base font-mono focus:outline-none focus:relative focus:z-10 focus:ring-2 focus:ring-blue-600"
        />
      </div>
      </div>

      {/* Row 3: Species chips */}
      <div className="flex flex-wrap items-center gap-1.5 pl-2">
        <h4 className="font-semibold text-sm xs:text-base text-gray-500 mr-1">
          {displaySpecies.length} selected
        </h4>
        {visibleFilteredSpecies.map((name) => (
          <button
            key={name}
            onClick={() => toggleSpecies(name)}
            className={`px-2 xs:px-3 py-1 rounded-full text-sm font-medium transition-all ${
              displaySpecies.includes(name)
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {name}
          </button>
        ))}
        {overflowFilteredSpecies.length > 0 && (
          <div className="relative" ref={speciesOverflowRef}>
            <button
              type="button"
              onClick={() => setSpeciesOverflowOpen((open) => !open)}
              className="px-2 xs:px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-all"
            >
              +{overflowFilteredSpecies.length} others
            </button>

            {speciesOverflowOpen && (
              <div className="absolute z-20 mt-1 w-56 max-h-64 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg py-1">
                {overflowFilteredSpecies.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleSpecies(name)}
                    className="w-full flex items-center gap-2 text-left text-sm font-medium px-3 py-1.5 hover:bg-gray-100 text-gray-800"
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        displaySpecies.includes(name) ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    />
                    <span className="flex-1 truncate">{name}</span>
                    <Check
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        displaySpecies.includes(name) ? 'opacity-100' : 'opacity-0'
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
  )
}
