import { useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { hydrateInitialConditions } from '../../utils/hydrateConditions'
import {
  setTemperature,
  setPressure,
  setConcentrations,
  setRateConstants,
  markInitialHydrated,
  setEvolvingEnabled,
  setEvolvingTimes,
  setEvolvingTemperature,
  setEvolvingPressure,
  setEvolvingAdditionalSeries,
  untagEvolvingRows,
} from '../../redux/slices/conditionsSlice'
import { useToast } from '@/hooks/use-toast'
import { useClickOutside } from '../../hooks/useClickOutside'
import { EMPTY_ARRAY } from '../../utils/emptyArray'
import { LIST_CARD, LIST_CARD_CONTENT, TEXT_INPUT_SM } from '../Mechanism/fieldStyles'
import { UnitDropdown } from '../Plots/UnitDropdown'
import { CONCENTRATION_UNITS, airDensityMolM3, toMolM3, fromMolM3 } from '../../utils/concentrationUnits'
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_PRESSURE,
  insertAdditionalSeriesValue,
  removeEvolvingTimeRows,
  commitEvolvingTime,
  ensureZeroTimeRow,
} from './evolvingSeries'

const filterButtonClass = (selected) =>
  `w-full text-left text-sm px-1.5 py-1 rounded ${
    selected
      ? 'text-assist-secondary-foreground font-semibold bg-assist-secondary'
      : 'text-muted hover:bg-surface-hover'
  }`

const NUMBER_INPUT =
  'w-2/3 px-2 py-1 border-1 rounded text-sm text-left font-mono focus:outline-none focus:ring-2 focus:ring-assist-secondary-ring transition-colors duration-300'

const UNIT_DROPDOWN_WRAPPER = 'relative flex-shrink-0 mr-3'
const UNIT_DROPDOWN_BUTTON =
  'flex items-center gap-1 w-full h-8 px-2 border border-gray-300 rounded-lg text-sm text-gray-800 hover:bg-gray-50 bg-white'

// Unlike ReactionTab's rate constants (always tiny, so the magnitude-conditional format reads
// as "always exponential" in practice), species concentrations span a much wider range -- always
// showing scientific notation keeps the column readable instead of dumping full float precision
// for a mid-magnitude value like 0.0213338320238172.
const formatValue = (value) => {
  if (typeof value !== 'number') return String(value)
  if (value === 0) return '0'
  return value.toExponential(2)
}

const hasName = (species) => typeof species.name === 'string' && species.name.trim() !== ''

const CONC_PREFIX = 'CONC.'

const DEFAULT_SELECTED_SPECIES = 3
const SPECIES_VISIBLE = 20
const MAX_SELECTED_SPECIES = 50

// See ReactionTab for why table-layout: fixed needs an explicit min-width floor.
const CHECKBOX_COLUMN_PX = 40 // w-10
const TIME_COLUMN_PX = 128 // w-32
const MIN_VALUE_COLUMN_PX = 160 // one reasonable column's worth of room

/**
 * SpeciesConcentrationTab Component
 * Time-varying concentrations for individual species
 */
export function SpeciesConcentrationTab() {
  const dispatch = useDispatch()
  const { toast } = useToast()
  const initial = useSelector((state) => state.conditions.initial)
  const conditions = useSelector((state) => state.conditions.conditions)
  const hydratedExampleId = useSelector((state) => state.conditions.hydration.initialExampleId)
  const currentExample = useSelector((state) => state.mechanism.currentExample)
  const mechanismSpecies = useSelector(
    (state) => state.mechanism.config.mechanism?.species || EMPTY_ARRAY
  )
  const evolvingTimes = useSelector((state) => state.conditions.evolving.times)
  const evolvingTemperature = useSelector((state) => state.conditions.evolving.temperature)
  const evolvingPressure = useSelector((state) => state.conditions.evolving.pressure)
  const additionalSeries = useSelector((state) => state.conditions.evolving.additionalSeries)

  const [selectedSpeciesNames, setSelectedSpeciesNames] = useState(new Set())
  const [speciesSearch, setSpeciesSearch] = useState('')
  const [concentrationUnitId, setConcentrationUnitId] = useState('mol_m3')
  const [rowDrafts, setRowDrafts] = useState({})
  const [justUpdatedCell, setJustUpdatedCell] = useState(null)
  const [selectedIndices, setSelectedIndices] = useState(new Set())
  const [speciesSectionOpen, setSpeciesSectionOpen] = useState(true)
  const [speciesOverflowOpen, setSpeciesOverflowOpen] = useState(false)
  const speciesOverflowRef = useRef(null)
  useClickOutside(speciesOverflowRef, () => setSpeciesOverflowOpen(false), speciesOverflowOpen)
  const [addTimeOpen, setAddTimeOpen] = useState(false)
  const [newTimeValue, setNewTimeValue] = useState('')
  const addTimeRef = useRef(null)
  useClickOutside(addTimeRef, () => setAddTimeOpen(false), addTimeOpen)

  useEffect(() => {
    const exampleId = currentExample?.id

    if (!exampleId || hydratedExampleId === exampleId) {
      return
    }

    const hydrated = hydrateInitialConditions(conditions)
    if (hydrated.temperature !== null) dispatch(setTemperature(hydrated.temperature))
    if (hydrated.pressure !== null) dispatch(setPressure(hydrated.pressure))
    dispatch(setConcentrations(hydrated.concentrations))
    dispatch(setRateConstants(hydrated.rateConstants))
    dispatch(markInitialHydrated(exampleId))
  }, [currentExample, dispatch, conditions, hydratedExampleId])

  const namedSpecies = mechanismSpecies.filter(hasName)

  const speciesQuery = speciesSearch.trim().toLowerCase()
  const filteredSpecies = speciesQuery
    ? namedSpecies.filter((species) => species.name.toLowerCase().includes(speciesQuery))
    : namedSpecies

  // Keep the selection pointed at species that are still present, falling back to the first
  // few in the mechanism when it changes out from under the current selection.
  useEffect(() => {
    const currentSpecies = mechanismSpecies.filter(hasName)
    setSelectedSpeciesNames((prev) => {
      const stillValid = [...prev].filter((name) =>
        currentSpecies.some((species) => species.name === name)
      )
      if (stillValid.length > 0) return new Set(stillValid)
      return new Set(currentSpecies.slice(0, DEFAULT_SELECTED_SPECIES).map((s) => s.name))
    })
  }, [mechanismSpecies])

  // Selected species beyond the visible cap stay visible until deselected.
  const baseVisibleSpecies = filteredSpecies.slice(0, SPECIES_VISIBLE)
  const overflowCandidateSpecies = filteredSpecies.slice(SPECIES_VISIBLE)
  const pinnedOverflowSpecies = overflowCandidateSpecies.filter((species) =>
    selectedSpeciesNames.has(species.name)
  )
  const visibleSpecies = [...baseVisibleSpecies, ...pinnedOverflowSpecies]
  const overflowSpecies = overflowCandidateSpecies.filter(
    (species) => !selectedSpeciesNames.has(species.name)
  )

  const toggleSpeciesName = (name) => {
    setSelectedSpeciesNames((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const handleSelectAllSpecies = () => {
    const names = namedSpecies.map((species) => species.name)
    setSelectedSpeciesNames(new Set(names.slice(0, MAX_SELECTED_SPECIES)))
    if (names.length > MAX_SELECTED_SPECIES) {
      toast({
        title: 'Selection Limited',
        description: `Selected the first ${MAX_SELECTED_SPECIES} of ${names.length} species. Use search to select others.`,
      })
    }
  }

  const handleDeselectAllSpecies = () => {
    setSelectedSpeciesNames(new Set())
  }

  // A species' data lives under CONC.<name> (or CONC.<name>.<unit> once stored), same key
  // discovery ReactionTab uses for PHOTO./SURF. -- tolerate a stored unit suffix.
  const concentrationKeyFor = (speciesName) => {
    const bareKey = `${CONC_PREFIX}${speciesName}`
    const existingKey = Object.keys(additionalSeries || {}).find(
      (key) => key === bareKey || key.startsWith(`${bareKey}.`)
    )
    return existingKey ?? `${bareKey}.mol m-3`
  }

  const selectedSpecies = namedSpecies.filter((species) => selectedSpeciesNames.has(species.name))
  const columns = selectedSpecies.map((species) => ({
    key: concentrationKeyFor(species.name),
    label: species.name,
    name: species.name,
  }))

  const timeEntries = evolvingTimes.map((time, index) => ({ time, index }))
  const removableIndices = timeEntries.map((entry) => entry.index)

  useEffect(() => {
    setRowDrafts({})
    setJustUpdatedCell(null)
    setSelectedIndices(new Set())
  }, [selectedSpeciesNames, evolvingTimes])

  const cellDraftKey = (key, index) => `${key}::${index}`

  const flashUpdated = (cellKey) => {
    setJustUpdatedCell(cellKey)
    setTimeout(() => {
      setJustUpdatedCell((current) => (current === cellKey ? null : current))
    }, 600)
  }

  const handleValueChange = (key, index, value) => {
    setRowDrafts((prev) => ({ ...prev, [cellDraftKey(key, index)]: value }))
  }

  const commitValue = (key, index, rawValue) => {
    const trimmed = rawValue.trim()
    const displayed = trimmed === '' ? null : parseFloat(trimmed)
    if (trimmed !== '' && (isNaN(displayed) || displayed < 0)) {
      toast({
        title: 'Invalid Input',
        description: 'Concentration must be a valid number zero or greater',
        variant: 'destructive',
      })
      return
    }

    const temperature = evolvingTemperature[index] ?? DEFAULT_TEMPERATURE
    const pressure = evolvingPressure[index] ?? DEFAULT_PRESSURE
    const airDensity = airDensityMolM3(pressure, temperature)
    const parsed = displayed === null ? null : toMolM3(displayed, concentrationUnitId, airDensity)

    const existing = Array.isArray(additionalSeries[key])
      ? [...additionalSeries[key]]
      : new Array(evolvingTimes.length).fill(null)
    while (existing.length < evolvingTimes.length) existing.push(null)

    // Clicking into a cell and back out without typing anything shouldn't flash it or write to
    // Redux -- only an actual change counts as an update.
    const unchanged = existing[index] === parsed || (existing[index] == null && parsed == null)
    setRowDrafts((prev) => {
      const next = { ...prev }
      delete next[cellDraftKey(key, index)]
      return next
    })
    if (unchanged) return

    existing[index] = parsed
    dispatch(setEvolvingAdditionalSeries({ ...additionalSeries, [key]: existing }))
    flashUpdated(cellDraftKey(key, index))
  }

  const TIME_DRAFT_KEY = '__time__'

  const commitTime = (index, rawValue) => {
    const outcome = commitEvolvingTime(
      { times: evolvingTimes, temperature: evolvingTemperature, pressure: evolvingPressure, additionalSeries },
      index,
      rawValue
    )

    if (outcome.kind === 'invalid') {
      // Leave the draft in place so the invalid text stays visible to fix, instead of
      // silently reverting to the last committed value.
      toast({
        title: 'Invalid Input',
        description: 'Time must be a valid number zero or greater',
        variant: 'destructive',
      })
      return
    }

    setRowDrafts((prev) => {
      const next = { ...prev }
      delete next[cellDraftKey(TIME_DRAFT_KEY, index)]
      return next
    })

    if (outcome.kind === 'unchanged') return
    if (outcome.kind === 'duplicate') {
      toast({
        title: 'Duplicate Time Point',
        description: `A time point already exists at t=${outcome.newTime}s`,
        variant: 'destructive',
      })
      return
    }

    const { result } = outcome
    dispatch(setEvolvingTimes(result.times))
    dispatch(setEvolvingTemperature(result.temperature))
    dispatch(setEvolvingPressure(result.pressure))
    dispatch(setEvolvingAdditionalSeries(result.additionalSeries))

    toast({
      title: 'Time Point Updated',
      description: `Moved time point to t=${result.newTime}s`,
      variant: 'success',
    })
  }

  const toggleSelected = (index) => {
    if (!removableIndices.includes(index)) return
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const allSelected = removableIndices.length > 0 && removableIndices.every((i) => selectedIndices.has(i))

  const toggleSelectAll = () => {
    setSelectedIndices((prev) => {
      const allCurrentlySelected = removableIndices.length > 0 && removableIndices.every((i) => prev.has(i))
      const next = new Set(prev)
      removableIndices.forEach((i) => (allCurrentlySelected ? next.delete(i) : next.add(i)))
      return next
    })
  }

  const handleRemoveSelected = () => {
    const result = removeEvolvingTimeRows(
      { times: evolvingTimes, temperature: evolvingTemperature, pressure: evolvingPressure, additionalSeries },
      selectedIndices
    )
    if (!result) return

    dispatch(setEvolvingTimes(result.times))
    dispatch(setEvolvingTemperature(result.temperature))
    dispatch(setEvolvingPressure(result.pressure))
    dispatch(setEvolvingAdditionalSeries(result.additionalSeries))
    dispatch(untagEvolvingRows(result.removedTimes))

    toast({
      title: result.removedCount === 1 ? 'Time Point Removed' : 'Time Points Removed',
      description: `Removed ${result.removedCount} time point${result.removedCount === 1 ? '' : 's'}`,
      variant: 'delete',
    })
    setSelectedIndices(new Set())
  }

  const handleAddTimePoint = () => {
    const trimmed = newTimeValue.trim()
    const time = parseFloat(trimmed)
    if (trimmed === '' || isNaN(time) || time < 0) {
      toast({
        title: 'Invalid Input',
        description: 'Time must be a valid number zero or greater',
        variant: 'destructive',
      })
      return
    }

    if (evolvingTimes.includes(time)) {
      toast({
        title: 'Duplicate Time Point',
        description: `A time point already exists at t=${time}s`,
        variant: 'destructive',
      })
      return
    }

    // t=0 is always the default starting point
    const withZero = ensureZeroTimeRow(
      { times: evolvingTimes, temperature: evolvingTemperature, pressure: evolvingPressure, additionalSeries },
      time
    )

    const newTimes = [...withZero.times, time].sort((a, b) => a - b)
    const insertIndex = newTimes.indexOf(time)

    const newTemperature = [...withZero.temperature]
    newTemperature.splice(insertIndex, 0, DEFAULT_TEMPERATURE)

    const newPressure = [...withZero.pressure]
    newPressure.splice(insertIndex, 0, DEFAULT_PRESSURE)

    const newAdditionalSeries = insertAdditionalSeriesValue(withZero.additionalSeries, insertIndex)

    dispatch(setEvolvingEnabled(true))
    dispatch(setEvolvingTimes(newTimes))
    dispatch(setEvolvingTemperature(newTemperature))
    dispatch(setEvolvingPressure(newPressure))
    dispatch(setEvolvingAdditionalSeries(newAdditionalSeries))

    toast({
      title: 'Time Point Added',
      description: `Added time point at t=${time}s`,
      variant: 'success',
    })
    setNewTimeValue('')
    setAddTimeOpen(false)
  }

  const unitLabel = CONCENTRATION_UNITS.find((u) => u.id === concentrationUnitId)?.label

  return (
    <Card className={LIST_CARD}>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Species concentration</CardTitle>
            <CardDescription className="whitespace-nowrap">
              Set time-varying species concentrations, shown in {unitLabel}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Always mounted (just hidden) so the header's height never shifts */}
            <Button
              variant="glass"
              size="sm"
              onClick={handleRemoveSelected}
              className={`rounded-lg border-2 border-red-600 bg-white text-red-600 hover:bg-red-50 flex-shrink-0 ${
                selectedIndices.size === 0 ? 'invisible' : ''
              }`}
            >
              Remove ({selectedIndices.size})
            </Button>

            <div className="relative" ref={addTimeRef}>
              <Button
                variant="glass"
                size="sm"
                onClick={() => setAddTimeOpen((open) => !open)}
                className="rounded-lg border-2 border-assist-secondary-ring bg-white text-assist-secondary-ring hover:bg-assist-secondary"
              >
                Add
              </Button>

              {addTimeOpen && (
                <div className="absolute right-0 z-20 mt-1 w-40 bg-white border border-border rounded-lg shadow-lg p-3">
                  <label className="block px-1 text-xs font-semibold text-ink mb-1">
                    New time point
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newTimeValue}
                    onChange={(e) => setNewTimeValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTimePoint()
                      }
                    }}
                    placeholder="seconds"
                    autoFocus
                    className={`w-full focus:!ring-assist-secondary-ring ${TEXT_INPUT_SM}`}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className={LIST_CARD_CONTENT}>
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          {/* Sidebar filters */}
          <div className="w-full lg:w-56 flex-shrink-0 space-y-5 lg:overflow-y-auto">
            <div>
              <button
                type="button"
                onClick={() => setSpeciesSectionOpen((open) => !open)}
                className="w-full flex items-center justify-between whitespace-nowrap text-sm font-semibold text-ink mb-2"
              >
                Species
                {speciesSectionOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {speciesSectionOpen && (
                <>
                  <UnitDropdown
                    unitId={concentrationUnitId}
                    onChange={(id) => {
                      setConcentrationUnitId(id)
                      setRowDrafts({})
                    }}
                    units={CONCENTRATION_UNITS}
                    wrapperClassName={`${UNIT_DROPDOWN_WRAPPER} mb-2`}
                    buttonClassName={UNIT_DROPDOWN_BUTTON}
                    centerLabel
                  />

                  <input
                    type="text"
                    value={speciesSearch}
                    onChange={(e) => setSpeciesSearch(e.target.value)}
                    placeholder="Search by name"
                    className={`w-[calc(100%-0.75rem)] block !h-8 mb-2 focus:!border-action ${TEXT_INPUT_SM}`}
                  />

                  <div className="flex items-center gap-2 mb-2 pl-1">
                    <button
                      type="button"
                      onClick={handleSelectAllSpecies}
                      className="text-sm text-action hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-sm text-muted">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllSpecies}
                      className="text-sm text-action hover:underline"
                    >
                      Deselect all
                    </button>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    {visibleSpecies.map((species) => (
                      <button
                        key={species.id ?? species.name}
                        type="button"
                        onClick={() => toggleSpeciesName(species.name)}
                        className={filterButtonClass(selectedSpeciesNames.has(species.name))}
                      >
                        {species.name}
                      </button>
                    ))}

                    {overflowSpecies.length > 0 && (
                      <div className="relative" ref={speciesOverflowRef}>
                        <button
                          type="button"
                          onClick={() => setSpeciesOverflowOpen((open) => !open)}
                          className="text-left text-sm px-1.5 py-1 rounded text-muted hover:bg-surface-hover"
                        >
                          +{overflowSpecies.length} others
                        </button>

                        {speciesOverflowOpen && (
                          <div className="absolute z-20 mt-1 w-48 max-h-56 overflow-y-auto bg-white border border-border rounded-lg shadow-lg py-1">
                            {overflowSpecies.map((species) => (
                              <button
                                key={species.id ?? species.name}
                                type="button"
                                onClick={() => toggleSpeciesName(species.name)}
                                className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 text-ink hover:bg-surface-hover"
                              >
                                <Check
                                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                                    selectedSpeciesNames.has(species.name) ? 'opacity-100' : 'opacity-0'
                                  }`}
                                />
                                <span className="flex-1 truncate">{species.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Main content: time table */}
          <div className="flex-1 min-h-0 lg:relative">
            <div className="border border-gray-200 rounded-lg overflow-auto lg:absolute lg:inset-0">
              {evolvingTimes.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No time points configured. Click "Add" above to create one.
                </p>
              ) : columns.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Choose one or more species on the left to see their time-varying concentrations.
                </p>
              ) : (
                <table
                  className="w-full table-fixed text-sm"
                  style={{
                    minWidth: `${CHECKBOX_COLUMN_PX + TIME_COLUMN_PX + columns.length * MIN_VALUE_COLUMN_PX}px`,
                  }}
                >
                  <thead className="bg-assist-secondary text-assist-secondary-foreground">
                    <tr>
                      <th className="w-10 text-left px-4 py-2">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all time points"
                          className="accent-assist-secondary-ring"
                        />
                      </th>
                      <th className="w-32 text-left px-4 py-2 font-semibold">Time (s)</th>
                      {columns.map((column) => (
                        <th key={column.key} className="text-left px-4 py-2 font-semibold">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeEntries.map(({ time, index }) => {
                      const temperature = evolvingTemperature[index] ?? DEFAULT_TEMPERATURE
                      const pressure = evolvingPressure[index] ?? DEFAULT_PRESSURE
                      const airDensity = airDensityMolM3(pressure, temperature)

                      return (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selectedIndices.has(index)}
                              onChange={() => toggleSelected(index)}
                              aria-label={`Select time point at t=${time}s`}
                              className="accent-assist-secondary-ring"
                            />
                          </td>
                          <td className="px-4 py-2 font-mono">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={rowDrafts[cellDraftKey(TIME_DRAFT_KEY, index)] ?? time}
                              onChange={(e) => handleValueChange(TIME_DRAFT_KEY, index, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  commitTime(index, e.target.value)
                                  e.target.blur()
                                }
                              }}
                              onBlur={(e) => commitTime(index, e.target.value)}
                              className={`${NUMBER_INPUT} focus:border-assist-secondary-ring border-gray-300 bg-white`}
                            />
                          </td>
                          {columns.map((column) => {
                            const stored = additionalSeries?.[column.key]?.[index]
                            // Species that haven't been touched in this table yet still show
                            // their legacy snapshot value at t=0; editing the cell migrates
                            // that species onto its own CONC series from then on.
                            const legacyFallback =
                              time === 0 && (stored === null || stored === undefined)
                                ? initial.concentrations[column.name]
                                : undefined
                            const raw = stored ?? legacyFallback
                            const draftKey = cellDraftKey(column.key, index)
                            const displayValue =
                              rowDrafts[draftKey] ??
                              (raw === null || raw === undefined
                                ? ''
                                : formatValue(fromMolM3(raw, concentrationUnitId, airDensity)))
                            return (
                              <td key={column.key} className="px-4 py-2 font-mono">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={displayValue}
                                  onChange={(e) =>
                                    handleValueChange(column.key, index, e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      commitValue(column.key, index, e.target.value)
                                      e.target.blur()
                                    }
                                  }}
                                  onBlur={(e) => commitValue(column.key, index, e.target.value)}
                                  placeholder="not set"
                                  className={`${NUMBER_INPUT} focus:border-assist-secondary-ring ${
                                    justUpdatedCell === draftKey
                                      ? 'border-action bg-assist-secondary'
                                      : 'border-gray-300 bg-white'
                                  }`}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SpeciesConcentrationTab
