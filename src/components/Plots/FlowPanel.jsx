import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Check } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { getResultSpeciesNames } from './speciesFormat'
import { RangeBoundInput } from './RangeBoundInput'
import { TIME_RANGE_UNITS } from './timeRangeUnits'
import { UnitDropdown } from './UnitDropdown'
import { TEXT_INPUT_SM } from '../Mechanism/fieldStyles'
import { getReactionTypeLabel } from '../Mechanism/reactions/reactionRegistry'
import { EMPTY_ARRAY } from '../../utils/emptyArray'
import { selectRunDuration } from '../../redux/slices/simulationSlice'
import { selectNamedReactions } from '../../redux/slices/mechanismSlice'

// Show at most this many species as chips before collapsing the rest into a "+N others" menu
const SPECIES_CHIP_VISIBLE = 25

// Mechanisms at or under this size default to all species selected.
// Larger mechanisms default to none to keep graphs readable.
const SPECIES_AUTO_SELECT_THRESHOLD = 15

const SECTION_LABEL = 'text-sm font-semibold text-ink mb-2'
const UNIT_DROPDOWN_WRAPPER = 'relative flex-shrink-0 mr-3'
const UNIT_DROPDOWN_BUTTON =
  'flex items-center gap-1 w-full h-8 px-2 border border-gray-300 dark:border-border rounded-lg text-sm text-gray-800 dark:text-ink hover:bg-gray-50 dark:hover:bg-surface-hover bg-white dark:bg-surface'
const RANGE_ROW = 'flex items-center mr-3 border border-border rounded-lg bg-white dark:bg-surface'
const RANGE_INPUT =
  'flex-1 min-w-0 h-8 px-2 bg-white dark:bg-surface text-ink rounded-lg text-sm text-center focus:outline-none focus:relative focus:z-10 focus:ring-2 focus:ring-action'

const filterButtonClass = (selected) =>
  `w-full text-left text-sm px-1.5 py-1 rounded ${
    selected
      ? 'text-assist-secondary-foreground font-semibold bg-assist-secondary'
      : 'text-muted hover:bg-surface-hover'
  }`

const VALUE_DISPLAY_OPTIONS = [
  { id: 'absolute', label: 'Absolute' },
  { id: 'relative', label: 'Relative' },
]

const ARROW_SCALING_OPTIONS = [
  { id: 'linear', label: 'Linear' },
  { id: 'logarithmic', label: 'Logarithmic' },
]

/*
 * FlowPanel Component
 * Creates a control panel that allows for customization of flow visualizations
 * Features include:
 *   - Value Display (absolute magnitude or relative contribution)
 *   - Arrow Width Scaling (linear or logarithmic)
 *   - Time Range selection (seconds or hours)
 *   - Integrated reaction rate range selection (in the selected concentration unit)
 *   - Species search and selection list
 * Rendered as the sidebar of the flow diagram card.
 */

export function FlowPanel({
  arrowScaling,
  setArrowScaling,
  range,
  setRange,
  rateRange,
  setRateRange,
  selectedSpecies,
  setSelectedSpecies,
  reactionTypes,
  setReactionTypes,
  valueDisplay,
  setValueDisplay,
  concentrationUnitId,
  concentrationUnits,
  setConcentrationUnitId,
  fluxUnitLabel = 'mol m-3',
}) {
  const results = useSelector((state) => state.simulation.results)
  const reactions = useSelector(selectNamedReactions)

  const reactionTypeOptions = useMemo(() => {
    const counts = new Map()
    for (const reaction of reactions ?? []) {
      const type = reaction.type || 'UNKNOWN'
      counts.set(type, (counts.get(type) ?? 0) + 1)
    }

    return [...counts.keys()].sort().map((type) => ({
      value: type,
      label: `${getReactionTypeLabel(type)} (${counts.get(type)})`,
    }))
  }, [reactions])

  // Selections go stale when the mechanism changes; drop types that no longer exist so the
  // graph never filters by a type the list can't show.
  const activeReactionTypes = reactionTypes.filter((type) =>
    reactionTypeOptions.some((option) => option.value === type)
  )

  useEffect(() => {
    if (activeReactionTypes.length !== reactionTypes.length) setReactionTypes(activeReactionTypes)
  }, [activeReactionTypes, reactionTypes, setReactionTypes])

  const toggleReactionType = (type) => {
    setReactionTypes(
      reactionTypes.includes(type)
        ? reactionTypes.filter((t) => t !== type)
        : [...reactionTypes, type]
    )
  }

  // Upper bound for Time Range — results never extend past the simulation length.
  const duration = useSelector(selectRunDuration)
  const speciesNames = useMemo(() => getResultSpeciesNames(results), [results])
  const displaySpecies = selectedSpecies || []

  const [initialized, setInitialized] = useState(false)

  // Small mechanisms default to all species selected. Larger mechanisms default to
  // none to avoid producing an unreadable graph when everything is selected.
  useEffect(() => {
    if (!initialized && speciesNames.length > 0 && displaySpecies.length === 0) {
      if (speciesNames.length <= SPECIES_AUTO_SELECT_THRESHOLD) {
        setSelectedSpecies(speciesNames)
      }
      setInitialized(true)
    }
  }, [speciesNames, displaySpecies.length, initialized, setSelectedSpecies])

  const [speciesSearch, setSpeciesSearch] = useState('')
  const [speciesOverflowOpen, setSpeciesOverflowOpen] = useState(false)
  const [timeRangeUnitId, setTimeRangeUnitId] = useState('seconds')
  const speciesOverflowRef = useRef(null)
  const closeSpeciesOverflow = useCallback(() => setSpeciesOverflowOpen(false), [])
  useClickOutside(speciesOverflowRef, closeSpeciesOverflow, speciesOverflowOpen)

  const timeRangeUnit =
    TIME_RANGE_UNITS.find((u) => u.id === timeRangeUnitId) ?? TIME_RANGE_UNITS[0]

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

  // Selected species stay pinned in the visible row, even beyond the cap, until deselected,
  // so active filters are never hidden behind "+N others".
  const baseVisibleFilteredSpecies = filteredSpecies.slice(0, SPECIES_CHIP_VISIBLE)
  const overflowCandidates = filteredSpecies.slice(SPECIES_CHIP_VISIBLE)
  const pinnedOverflowSpecies = overflowCandidates.filter((name) => displaySpecies.includes(name))
  const visibleFilteredSpecies = [...baseVisibleFilteredSpecies, ...pinnedOverflowSpecies]
  const overflowFilteredSpecies = overflowCandidates.filter(
    (name) => !displaySpecies.includes(name)
  )

  return (
    <div className="w-full lg:w-[16.8rem] flex-shrink-0 space-y-5 lg:overflow-y-auto">
      <div>
        <p className={SECTION_LABEL}>Value display</p>
        <UnitDropdown
          unitId={valueDisplay}
          onChange={setValueDisplay}
          units={VALUE_DISPLAY_OPTIONS}
          wrapperClassName={UNIT_DROPDOWN_WRAPPER}
          buttonClassName={UNIT_DROPDOWN_BUTTON}
          centerLabel
        />
      </div>

      <div>
        <p className={SECTION_LABEL}>Arrow scaling</p>
        <UnitDropdown
          unitId={arrowScaling}
          onChange={setArrowScaling}
          units={ARROW_SCALING_OPTIONS}
          wrapperClassName={UNIT_DROPDOWN_WRAPPER}
          buttonClassName={UNIT_DROPDOWN_BUTTON}
          centerLabel
        />
      </div>

      <div>
        <p className={SECTION_LABEL}>Time range</p>
        <UnitDropdown
          unitId={timeRangeUnitId}
          onChange={setTimeRangeUnitId}
          units={TIME_RANGE_UNITS}
          wrapperClassName={`${UNIT_DROPDOWN_WRAPPER} mb-2`}
          buttonClassName={UNIT_DROPDOWN_BUTTON}
          centerLabel
        />
        <div className={RANGE_ROW}>
          <RangeBoundInput
            value={range.start}
            divisor={timeRangeUnit.divisor}
            min={0}
            max={range.end}
            onCommit={(start) => setRange({ start, end: range.end })}
            className={RANGE_INPUT}
          />
          <span className="px-1 text-muted font-normal">-</span>
          <RangeBoundInput
            value={range.end}
            divisor={timeRangeUnit.divisor}
            min={range.start}
            max={duration}
            onCommit={(end) => setRange({ start: range.start, end })}
            className={RANGE_INPUT}
          />
        </div>
      </div>

      {/* Relative mode shows percentages, which have no unit */}
      {valueDisplay !== 'relative' && setConcentrationUnitId && (
        <div>
          <p className={SECTION_LABEL}>Flux unit</p>
          <UnitDropdown
            unitId={concentrationUnitId}
            onChange={setConcentrationUnitId}
            units={concentrationUnits}
            wrapperClassName={UNIT_DROPDOWN_WRAPPER}
            buttonClassName={UNIT_DROPDOWN_BUTTON}
            centerLabel
          />
        </div>
      )}

      <div>
        <p className={SECTION_LABEL}>Flux ({fluxUnitLabel})</p>
        <div className={RANGE_ROW}>
          <RangeBoundInput
            value={rateRange.start}
            sigDigits={4}
            min={0}
            max={rateRange.end}
            onCommit={(start) => setRateRange({ start, end: rateRange.end })}
            className={RANGE_INPUT}
          />
          <span className="px-1 text-muted font-normal">-</span>
          <RangeBoundInput
            value={rateRange.end}
            sigDigits={4}
            min={rateRange.start}
            onCommit={(end) => setRateRange({ start: rateRange.start, end })}
            className={RANGE_INPUT}
          />
        </div>
      </div>

      <div>
        <p className={SECTION_LABEL}>Reactions</p>
        <div className="max-h-64 overflow-y-auto flex flex-col gap-0.5 pr-1">
          <button
            type="button"
            onClick={() => setReactionTypes([])}
            className={filterButtonClass(activeReactionTypes.length === 0)}
          >
            All reactions ({reactions?.length ?? 0})
          </button>
          {reactionTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleReactionType(option.value)}
              className={filterButtonClass(activeReactionTypes.includes(option.value))}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className={SECTION_LABEL}>Species</p>
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
          {visibleFilteredSpecies.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggleSpecies(name)}
              className={filterButtonClass(displaySpecies.includes(name))}
            >
              {name}
            </button>
          ))}

          {overflowFilteredSpecies.length > 0 && (
            <div className="relative" ref={speciesOverflowRef}>
              <button
                type="button"
                onClick={() => setSpeciesOverflowOpen((open) => !open)}
                className="text-left text-sm px-1.5 py-1 rounded text-muted hover:bg-surface-hover"
              >
                +{overflowFilteredSpecies.length} others
              </button>

              {speciesOverflowOpen && (
                <div className="absolute z-20 mt-1 w-48 max-h-56 overflow-y-auto bg-white dark:bg-surface border border-border rounded-lg shadow-lg py-1">
                  {overflowFilteredSpecies.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleSpecies(name)}
                      className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 text-ink hover:bg-surface-hover"
                    >
                      <Check
                        className={`w-3.5 h-3.5 flex-shrink-0 ${
                          displaySpecies.includes(name) ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <span className="flex-1 truncate">{name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
