import { useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import {
  setEvolvingEnabled,
  setEvolvingTimes,
  setEvolvingTemperature,
  setEvolvingPressure,
  setEvolvingAdditionalSeries,
  tagEvolvingRow,
  untagEvolvingRows,
} from '../../redux/slices/conditionsSlice'
import { useToast } from '@/hooks/use-toast'
import { useClickOutside } from '../../hooks/useClickOutside'
import { EMPTY_ARRAY } from '../../utils/emptyArray'
import { LIST_CARD, LIST_CARD_CONTENT, TEXT_INPUT_SM } from '../Mechanism/fieldStyles'
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_PRESSURE,
  insertAdditionalSeriesValue,
  removeEvolvingTimeRows,
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

const formatValue = (value) => {
  if (typeof value !== 'number') return String(value)
  if (value === 0) return '0'
  const magnitude = Math.abs(value)
  return magnitude < 1e-3 || magnitude >= 1e6 ? value.toExponential(2) : String(value)
}

// Surface properties
const stripPropertyUnit = (prop) => {
  const lastDot = prop.lastIndexOf('.')
  return lastDot === -1 ? prop : prop.slice(0, lastDot)
}

const hasName = (reaction) => typeof reaction.name === 'string' && reaction.name.trim() !== ''

// A stable fallback for the rowReactionType selector, matching EMPTY_ARRAY's reasoning: a fresh
// {} on every call would make useSyncExternalStore treat every render as a real change.
const EMPTY_ROW_TAGS = {}

const DEFAULT_SELECTED_REACTIONS = 3
const REACTIONS_VISIBLE = 13

// table-layout: fixed ignores a cell's own min-width when sizing columns -- it only divides the
// table's own width among the unsized value columns, so it will squeeze them arbitrarily thin
// rather than ever exceeding the container. The floor has to live on the table's own min-width
// instead: below it, the table fills the container and value columns share the space equally;
// above it, the table grows wider than the container and the wrapping overflow-auto scrolls.
const CHECKBOX_COLUMN_PX = 40 // w-10
const TIME_COLUMN_PX = 128 // w-32
const MIN_VALUE_COLUMN_PX = 160 // one reasonable column's worth of room

const REACTION_TYPES = [
  { id: 'PHOTOLYSIS', label: 'Photolysis', prefix: 'PHOTO' },
  { id: 'SURFACE', label: 'Surface', prefix: 'SURF' },
  { id: 'EMISSION', label: 'Emissions', prefix: 'EMIS' },
  { id: 'FIRST_ORDER_LOSS', label: 'Loss', prefix: 'LOSS' },
]

/**
 * ReactionTab Component
 * Time-varying rate parameters for specific reactions: 
 * - Photolysis, Surface, Emissions, Loss
 */
export function ReactionTab() {
  const dispatch = useDispatch()
  const { toast } = useToast()
  const mechanismReactions = useSelector(
    (state) => state.mechanism.config.mechanism?.reactions || EMPTY_ARRAY
  )
  const evolvingTimes = useSelector((state) => state.conditions.evolving.times)
  const evolvingTemperature = useSelector((state) => state.conditions.evolving.temperature)
  const evolvingPressure = useSelector((state) => state.conditions.evolving.pressure)
  const additionalSeries = useSelector((state) => state.conditions.evolving.additionalSeries)
  const evolvingRowReactionType = useSelector(
    (state) => state.conditions.evolving.rowReactionType || EMPTY_ROW_TAGS
  )

  const [reactionTypeId, setReactionTypeId] = useState(REACTION_TYPES[0].id)
  const [selectedReactionNames, setSelectedReactionNames] = useState(new Set())
  const [selectedSurfaceProperty, setSelectedSurfaceProperty] = useState(null)
  const [reactionSearch, setReactionSearch] = useState('')
  const [rowDrafts, setRowDrafts] = useState({})
  const [justUpdatedCell, setJustUpdatedCell] = useState(null)
  const [selectedIndices, setSelectedIndices] = useState(new Set())
  const [reactionSectionOpen, setReactionSectionOpen] = useState(true)
  const [rateConstantSectionOpen, setRateConstantSectionOpen] = useState(true)
  const [reactionOverflowOpen, setReactionOverflowOpen] = useState(false)
  const reactionOverflowRef = useRef(null)
  useClickOutside(reactionOverflowRef, () => setReactionOverflowOpen(false), reactionOverflowOpen)
  const [addTimeOpen, setAddTimeOpen] = useState(false)
  const [newTimeValue, setNewTimeValue] = useState('')
  const addTimeRef = useRef(null)
  useClickOutside(addTimeRef, () => setAddTimeOpen(false), addTimeOpen)

  const reactionType = REACTION_TYPES.find((t) => t.id === reactionTypeId)
  const isSurface = reactionTypeId === 'SURFACE'

  const reactionTypeCounts = REACTION_TYPES.map((type) => ({
    ...type,
    count: mechanismReactions.filter(
      (reaction) => reaction.type === type.id && hasName(reaction)
    ).length,
  }))

  // Only offer reaction types that are present in the loaded mechanism.
  const presentReactionTypes = reactionTypeCounts.filter((type) => type.count > 0)

  const reactionsOfType = mechanismReactions.filter(
    (reaction) => reaction.type === reactionTypeId && hasName(reaction)
  )

  const reactionQuery = reactionSearch.trim().toLowerCase()
  const filteredReactionsOfType = reactionQuery
    ? reactionsOfType.filter((reaction) => reaction.name.toLowerCase().includes(reactionQuery))
    : reactionsOfType

  // When a surface reaction is present, the nested surface dropdown lists its two available properties:
  // effective radius and particle number concentration.
  const surfacePropertyOptions = [
    ...new Set(
      mechanismReactions
        .filter((reaction) => reaction.type === 'SURFACE' && hasName(reaction))
        .flatMap((reaction) => {
          const prefix = `SURF.${reaction.name}.`
          return Object.keys(additionalSeries || {})
            .filter((key) => key.startsWith(prefix))
            .map((key) => stripPropertyUnit(key.slice(prefix.length)))
        })
    ),
  ].sort()

  // Selected reactions beyond the visible cap stay visible until deselected.
  const baseVisibleReactions = filteredReactionsOfType.slice(0, REACTIONS_VISIBLE)
  const overflowCandidateReactions = filteredReactionsOfType.slice(REACTIONS_VISIBLE)
  const pinnedOverflowReactions = overflowCandidateReactions.filter((reaction) =>
    selectedReactionNames.has(reaction.name)
  )
  const visibleReactionsOfType = [...baseVisibleReactions, ...pinnedOverflowReactions]
  const overflowReactionsOfType = overflowCandidateReactions.filter(
    (reaction) => !selectedReactionNames.has(reaction.name)
  )

  const toggleReactionName = (name) => {
    setSelectedReactionNames((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // Keep the selected type pointed at one that's present, falling back to the first
  // available type when the mechanism changes out from under the current selection.
  useEffect(() => {
    if (presentReactionTypes.some((type) => type.id === reactionTypeId)) return
    if (presentReactionTypes.length > 0) setReactionTypeId(presentReactionTypes[0].id)
  }, [presentReactionTypes, reactionTypeId])

  // Recomputes from mechanismReactions/reactionTypeId rather than depending on the derived 
  // reactionsOfType array. Selections are scoped to the active type.
  useEffect(() => {
    const currentReactionsOfType = mechanismReactions.filter(
      (reaction) => reaction.type === reactionTypeId && hasName(reaction)
    )
    setSelectedReactionNames((prev) => {
      const stillValid = [...prev].filter((name) =>
        currentReactionsOfType.some((reaction) => reaction.name === name)
      )
      if (stillValid.length > 0) return new Set(stillValid)
      return new Set(currentReactionsOfType.slice(0, DEFAULT_SELECTED_REACTIONS).map((r) => r.name))
    })
  }, [reactionTypeId, mechanismReactions])

  // Keep the selected surface property pointed at one that's present, falling back to the
  // first available option. Recomputes from mechanismReactions/additionalSeries -- both stable
  // selector outputs -- rather than depending on surfacePropertyOptions, which is a fresh array
  // every render.
  useEffect(() => {
    const options = [
      ...new Set(
        mechanismReactions
          .filter((reaction) => reaction.type === 'SURFACE' && hasName(reaction))
          .flatMap((reaction) => {
            const prefix = `SURF.${reaction.name}.`
            return Object.keys(additionalSeries || {})
              .filter((key) => key.startsWith(prefix))
              .map((key) => stripPropertyUnit(key.slice(prefix.length)))
          })
      ),
    ]
    setSelectedSurfaceProperty((prev) => (options.includes(prev) ? prev : (options[0] ?? null)))
  }, [mechanismReactions, additionalSeries])

  const selectedReactions = reactionsOfType.filter((reaction) =>
    selectedReactionNames.has(reaction.name)
  )

  // Each selected reaction contributes its own column. For surface reactions, only the one
  // property picked in the nested "Surface" dropdown is shown, same as every other type.
  const columns = selectedReactions.flatMap((reaction) => {
    if (isSurface) {
      if (!selectedSurfaceProperty) return []
      const surfacePrefix = `SURF.${reaction.name}.`
      const key = Object.keys(additionalSeries || {}).find(
        (candidate) =>
          candidate.startsWith(surfacePrefix) &&
          stripPropertyUnit(candidate.slice(surfacePrefix.length)) === selectedSurfaceProperty
      )
      return key ? [{ key, label: reaction.name }] : []
    }

    const bareKey = `${reactionType.prefix}.${reaction.name}`
    const existingKey = Object.keys(additionalSeries || {}).find(
      (key) => key === bareKey || key.startsWith(`${bareKey}.`)
    )
    return [{ key: existingKey ?? bareKey, label: reaction.name }]
  })

  // Row indices where the active type already has a value, checked across every reaction of
  // that type (not just the ones currently selected), so toggling a sidebar checkbox never
  // makes a row flicker in/out.
  const typeDataIndices = new Set(
    reactionsOfType.flatMap((reaction) => {
      const keys = isSurface
        ? Object.keys(additionalSeries || {}).filter((key) =>
            key.startsWith(`SURF.${reaction.name}.`)
          )
        : (() => {
            const bareKey = `${reactionType.prefix}.${reaction.name}`
            const existingKey = Object.keys(additionalSeries || {}).find(
              (key) => key === bareKey || key.startsWith(`${bareKey}.`)
            )
            return existingKey ? [existingKey] : []
          })()

      return keys.flatMap((key) => {
        const series = additionalSeries?.[key]
        if (!Array.isArray(series)) return []
        return series.flatMap((value, index) => (value != null ? [index] : []))
      })
    })
  )

  // A row shows under the active type if it has no type tags (added from Environment, or
  // predates this feature -- universal), was added/re-added under this type, or already has
  // data here.
  const visibleTimeEntries = evolvingTimes
    .map((time, index) => ({ time, index }))
    .filter(({ time, index }) => {
      const tags = evolvingRowReactionType[String(time)]
      if (!Array.isArray(tags) || tags.length === 0 || tags.includes(reactionTypeId)) return true
      return typeDataIndices.has(index)
    })
  // t=0 is the simulation's starting point, not an editable/removable evolving row.
  const removableIndices = visibleTimeEntries
    .filter((entry) => entry.time !== 0)
    .map((entry) => entry.index)

  // Clear on evolvingTimes changing
  useEffect(() => {
    setRowDrafts({})
    setJustUpdatedCell(null)
    setSelectedIndices(new Set())
  }, [selectedReactionNames, reactionTypeId, evolvingTimes])

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
    const parsed = trimmed === '' ? null : parseFloat(trimmed)
    if (trimmed !== '' && (isNaN(parsed) || parsed < 0)) {
      toast({
        title: 'Invalid Input',
        description: 'Value must be a valid number zero or greater',
        variant: 'destructive',
      })
      return
    }

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

  // Scoped to the removable rows visible for the active type -- t=0 is never included.
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
      const tags = evolvingRowReactionType[String(time)]
      const alreadyVisibleHere = !Array.isArray(tags) || tags.length === 0 || tags.includes(reactionTypeId)
      if (alreadyVisibleHere) {
        toast({
          title: 'Duplicate Time Point',
          description: `A time point already exists at t=${time}s`,
          variant: 'destructive',
        })
        return
      }

      // The row exists but was created under a different type and has no data of its own here
      // yet -- silently reveal it under this type too instead of refusing the add outright.
      dispatch(tagEvolvingRow({ time, typeId: reactionTypeId }))
      setNewTimeValue('')
      setAddTimeOpen(false)
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
    // Scopes this row to the active type until it also has data under another one (see
    // visibleTimeEntries above) -- so it's immediately visible here without leaking into
    // every other reaction type's table.
    dispatch(tagEvolvingRow({ time, typeId: reactionTypeId }))

    toast({
      title: 'Time Point Added',
      description: `Added time point at t=${time}s`,
      variant: 'success',
    })
    setNewTimeValue('')
    setAddTimeOpen(false)
  }

  return (
    <Card className={LIST_CARD}>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              {'Rate constant parameters'}
            </CardTitle>
            <CardDescription className="whitespace-nowrap">
              Set time-varying rate constant parameters
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
                onClick={() => setReactionSectionOpen((open) => !open)}
                className="w-full flex items-center justify-between whitespace-nowrap text-sm font-semibold text-ink mb-2"
              >
                Reactions
                {reactionSectionOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {reactionSectionOpen && (
                <div className="flex flex-col gap-0.5">
                  {presentReactionTypes.map((type) => (
                    <div key={type.id}>
                      <button
                        type="button"
                        onClick={() => setReactionTypeId(type.id)}
                        className={`w-full flex items-center justify-between ${filterButtonClass(
                          reactionTypeId === type.id
                        )}`}
                      >
                        <span>
                          {type.label} ({type.count})
                        </span>
                        {type.id === 'SURFACE' && surfacePropertyOptions.length > 0 && (
                          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                        )}
                      </button>

                      {/* Nested picker: a surface reaction can carry more than one property
                          (e.g. effective radius, particle number concentration) -- this keeps
                          only one shown in the table at a time, same as every other type. */}
                      {type.id === 'SURFACE' &&
                        reactionTypeId === 'SURFACE' &&
                        surfacePropertyOptions.length > 0 && (
                          <div className="flex flex-col gap-0.5 pl-4 mt-0.5">
                            {surfacePropertyOptions.map((property) => (
                              <button
                                key={property}
                                type="button"
                                onClick={() => setSelectedSurfaceProperty(property)}
                                className={filterButtonClass(selectedSurfaceProperty === property)}
                              >
                                {property}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setRateConstantSectionOpen((open) => !open)}
                className="w-full flex items-center justify-between whitespace-nowrap text-sm font-semibold text-ink mb-2"
              >
                Rate constant paramaters
                {rateConstantSectionOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {rateConstantSectionOpen && (
                <>
                  <input
                    type="text"
                    value={reactionSearch}
                    onChange={(e) => setReactionSearch(e.target.value)}
                    placeholder="Search by name"
                    className={`w-[98%] mx-auto block !h-8 mb-2 focus:!border-action ${TEXT_INPUT_SM}`}
                  />
                  <div className="flex flex-col gap-0.5">
                    {visibleReactionsOfType.map((reaction) => (
                      <button
                        key={reaction.id ?? reaction.name}
                        type="button"
                        onClick={() => toggleReactionName(reaction.name)}
                        className={filterButtonClass(selectedReactionNames.has(reaction.name))}
                      >
                        {reaction.name}
                      </button>
                    ))}

                    {overflowReactionsOfType.length > 0 && (
                      <div className="relative" ref={reactionOverflowRef}>
                        <button
                          type="button"
                          onClick={() => setReactionOverflowOpen((open) => !open)}
                          className="text-left text-sm px-1.5 py-1 rounded text-muted hover:bg-surface-hover"
                        >
                          +{overflowReactionsOfType.length} others
                        </button>

                        {reactionOverflowOpen && (
                          <div className="absolute z-20 mt-1 w-48 max-h-56 overflow-y-auto bg-white border border-border rounded-lg shadow-lg py-1">
                            {overflowReactionsOfType.map((reaction) => (
                              <button
                                key={reaction.id ?? reaction.name}
                                type="button"
                                onClick={() => toggleReactionName(reaction.name)}
                                className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 text-ink hover:bg-surface-hover"
                              >
                                <Check
                                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                                    selectedReactionNames.has(reaction.name)
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  }`}
                                />
                                <span className="flex-1 truncate">{reaction.name}</span>
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
                  No rate constant parameters configured
                </p>
              ) : visibleTimeEntries.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No time points for {reactionType.label} yet. Click "Add" above to create one.
                </p>
              ) : columns.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {isSurface && selectedReactionNames.size > 0
                    ? `No data for "${selectedSurfaceProperty ?? 'this property'}" yet for the selected reaction(s).`
                    : 'Choose one or more reactions on the left to see their time-varying rate constant parameters.'}
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
                      {/* No explicit width: table-layout: fixed divides the table's own width
                          equally across these columns. Below the table's min-width (set above),
                          that width is the full container, so they stretch to fill it; above it,
                          the table grows wider than the container and the wrapper scrolls. */}
                      {columns.map((column) => (
                        <th key={column.key} className="text-left px-4 py-2 font-semibold">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTimeEntries.map(({ time, index }) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIndices.has(index)}
                            onChange={() => toggleSelected(index)}
                            disabled={time === 0}
                            aria-label={
                              time === 0
                                ? 'Time point at t=0s cannot be removed'
                                : `Select time point at t=${time}s`
                            }
                            title={time === 0 ? 'The starting time point cannot be removed' : undefined}
                            className="accent-assist-secondary-ring disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-2 font-mono">{time}</td>
                        {columns.map((column) => {
                          const stored = additionalSeries?.[column.key]?.[index]
                          const draftKey = cellDraftKey(column.key, index)
                          const displayValue =
                            rowDrafts[draftKey] ??
                            (stored === null || stored === undefined ? '' : formatValue(stored))
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
                    ))}
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

export default ReactionTab
