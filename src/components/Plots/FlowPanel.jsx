import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { MultiRange } from '../ui/multirange'
import { useSelector } from 'react-redux'
import { ChevronDown, Check } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'

// Show at most this many species as chips before collapsing the rest into a "+N others" menu
const SPECIES_CHIP_VISIBLE = 25

const LAYOUT_OPTIONS = [
  { id: 'force', label: 'Force-Directed' },
  { id: 'layered', label: 'Layered (Flux Diagram)' },
]

const ARROW_SCALING_OPTIONS = [
  { id: 'linear', label: 'Linear' },
  { id: 'logarithmic', label: 'Logarithmic' },
]

/*
 * FlowPanel Component
 * Creates a control panel that allows for customization of flow visualizations
 * Features include:
 *   - Arrow Width Scaling (linear or logarithmic)
 *   - Time Range(s) Selection w/slider
 *   - Flux Range Slider (in mol m-3)
 *   - Species Selection Dropdown
 */

export function FlowPanel({
  arrowScaling,
  setArrowScaling,
  timeValues,
  range,
  setRange,
  fluxValues,
  fluxRange,
  setFluxRange,
  selectedSpecies,
  setSelectedSpecies,
  layoutMode,
  setLayoutMode,
}) {
  const species = useSelector((state) => state.mechanism.species)
  const speciesNames = useMemo(() => species.map((s) => s.name), [species])
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
  const selectAllMenuRef = useRef(null)
  const speciesOverflowRef = useRef(null)
  const layoutMenuRef = useRef(null)
  const arrowScalingMenuRef = useRef(null)
  const closeSelectAllMenu = useCallback(() => setSelectAllMenuOpen(false), [])
  const closeSpeciesOverflow = useCallback(() => setSpeciesOverflowOpen(false), [])
  const closeLayoutMenu = useCallback(() => setLayoutMenuOpen(false), [])
  const closeArrowScalingMenu = useCallback(() => setArrowScalingMenuOpen(false), [])
  useClickOutside(selectAllMenuRef, closeSelectAllMenu, selectAllMenuOpen)
  useClickOutside(speciesOverflowRef, closeSpeciesOverflow, speciesOverflowOpen)
  useClickOutside(layoutMenuRef, closeLayoutMenu, layoutMenuOpen)
  useClickOutside(arrowScalingMenuRef, closeArrowScalingMenu, arrowScalingMenuOpen)

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

  // Convert time values to indices and back
  const timeValueToIndex = (timeVal) => {
    if (!timeValues || timeValues.length === 0) return 0
    return timeValues.reduce(
      (bestIdx, v, i) =>
        Math.abs(v - timeVal) < Math.abs(timeValues[bestIdx] - timeVal) ? i : bestIdx,
      0
    )
  }

  const indexToTimeValue = (idx) => {
    return timeValues[Math.max(0, Math.min(idx, timeValues.length - 1))] || 0
  }

  // Convert range (time values) to indices for MultiRange
  const minIdx = timeValueToIndex(range.start)
  const maxIdx = timeValueToIndex(range.end)

  // console.log('range:', range);
  // console.log('timeValues first 5:', timeValues?.slice(0, 5));
  // console.log('minIdx:', minIdx, 'maxIdx:', maxIdx);

  const handleTimeRangeChange = (newRange) => {
    // console.log('handleTimeRangeChange called with:', newRange);
    const start = indexToTimeValue(newRange.minIndex)
    const end = indexToTimeValue(newRange.maxIndex)
    // console.log('setting range to:', { start, end });
    setRange({ start, end })
  }

  return (
    <div className="flex flex-wrap items-start gap-4 p-2 xs:p-3 sm:p-4 w-full rounded-lg bg-gray-50 text-gray-900 mt-2 xs:mt-3 sm:mt-4">
      {/* Species Selection */}
      <label className="flex flex-col gap-1 text-xs xs:text-sm font-semibold w-full">
        <div className="w-full font-normal text-base">
          <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 xs:gap-0 mb-3">
            {/* Select All / Deselect All + Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="flex items-center border border-gray-300 rounded-lg divide-x divide-gray-300 bg-white">
            <div className="relative" ref={selectAllMenuRef}>
              <button
                type="button"
                onClick={() => setSelectAllMenuOpen((open) => !open)}
                className="flex items-center justify-between gap-1 w-32 h-8 bg-white text-gray-900 rounded-l-lg text-xs font-bold px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
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

            <input
              type="text"
              value={speciesSearch}
              onChange={(e) => {
                setSpeciesSearch(e.target.value)
                setSpeciesOverflowOpen(false)
              }}
              placeholder="Search species"
              className="w-[30rem] h-8 px-3 bg-white text-gray-800 placeholder:text-gray-400 rounded-r-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            </div>

            <div className="flex items-center border border-gray-300 rounded-lg divide-x divide-gray-300 bg-white">
            <div className="relative" ref={layoutMenuRef}>
              <button
                type="button"
                onClick={() => setLayoutMenuOpen((open) => !open)}
                className="flex items-center justify-between gap-1 w-40 h-8 bg-white text-gray-900 rounded-l-lg text-xs font-bold px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {layoutOption.label}
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
              </button>

              {layoutMenuOpen && (
                <div className="absolute z-10 mt-1 min-w-[10rem] bg-white border border-gray-300 rounded-lg shadow-lg py-1">
                  {LAYOUT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setLayoutMode(option.id)
                        setLayoutMenuOpen(false)
                      }}
                      className="w-full flex items-center gap-2 text-left text-xs font-bold px-3 py-1.5 text-gray-800 hover:bg-gray-100"
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
                className="flex items-center justify-between gap-1 w-28 h-8 bg-white text-gray-900 rounded-r-lg text-xs font-bold px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {arrowScalingOption.label}
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
                      className="w-full flex items-center gap-2 text-left text-xs font-bold px-3 py-1.5 text-gray-800 hover:bg-gray-100"
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
            </div>
          </div>
        </div>

        {/* Species chips */}
          <div className="flex flex-wrap items-center gap-1.5 pl-2">
            <h4 className="font-semibold text-xs xs:text-sm text-gray-500 mr-1">
              {displaySpecies.length} selected
            </h4>
            {visibleFilteredSpecies.map((name) => (
              <button
                key={name}
                onClick={() => toggleSpecies(name)}
                className={`px-2 xs:px-3 py-1 rounded-full text-xs font-medium transition-all ${
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
                  className="px-2 xs:px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-all"
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
                        className="w-full flex items-center gap-2 text-left text-xs font-medium px-3 py-1.5 hover:bg-gray-100 text-gray-800"
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
      </label>

      {/* Time Range */}
      <label className="flex flex-col gap-1 text-xs xs:text-sm font-semibold w-64">
        Time Range [s]:
        <div className="w-full font-normal">
          <MultiRange
            values={timeValues}
            minIndex={minIdx}
            maxIndex={maxIdx}
            onChange={handleTimeRangeChange}
          />
        </div>
      </label>

      {/* Flux Range */}
      <label className="flex flex-col gap-1 text-xs xs:text-sm font-semibold w-64">
        Flux Range [mol m-3]:
        <div className="w-full font-normal">
          <MultiRange
            values={fluxValues}
            minIndex={fluxRange.minIndex}
            maxIndex={fluxRange.maxIndex}
            onChange={setFluxRange}
          />
        </div>
      </label>
    </div>
  )
}
