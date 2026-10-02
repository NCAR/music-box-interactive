import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import {
  setConditionsTable,
  tagTimeRow,
  untagTimeRows,
  renameTimeRowTag,
} from '../../redux/slices/conditionsSlice'
import { useNotify } from '@/hooks/use-notify'
import { useClickOutside } from '../../hooks/useClickOutside'
import { EMPTY_ARRAY } from '../../utils/emptyArray'
import { LIST_CARD, LIST_CARD_CONTENT, TEXT_INPUT_SM } from '../Mechanism/fieldStyles'
import {
  commitTime as commitTableTime,
  ensureZeroTimeRow,
  insertTimeRow,
  removeTimeRows,
  rowHasValues,
  setCell,
} from '../../services/conditions/table'
import {
  SURFACE_PROPERTIES,
  parseRateColumnKey,
  rateColumnKey,
  rateParameterUnit,
} from '../../services/conditions/rateColumns'
import { rateReactionNames } from '../../services/simulation/local/reactionNames'
import { HideUnsetRowsCheckbox } from './HideUnsetRowsCheckbox'

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


// A stable fallback for the rowReactionType selector, matching EMPTY_ARRAY's reasoning: a fresh
// {} on every call would make useSyncExternalStore treat every render as a real change.
const EMPTY_ROW_TAGS = {}

const DEFAULT_SELECTED_REACTIONS = 3
const REACTIONS_VISIBLE = 20
const MAX_SELECTED_REACTION = 50

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
  { id: 'USER_DEFINED', label: 'User defined', prefix: 'USER' },
]

// The properties of a surface reaction: the two that music-box knows, plus any other property
// that the table holds for that reaction.
const surfacePropertiesOf = (reactionId, tableColumns) => {
  const stored = Object.keys(tableColumns || {})
    .map(parseRateColumnKey)
    .filter((parsed) => parsed?.prefix === 'SURF' && parsed.reactionId === reactionId)
    .map((parsed) => parsed.property)
  const known = SURFACE_PROPERTIES.map((p) => p.property)
  return [...known, ...[...new Set(stored)].filter((property) => !known.includes(property)).sort()]
}

/**
 * ReactionTab Component
 * Time-varying rate parameters for specific reactions: 
 * - Photolysis, Surface, Emissions, Loss
 */
export function ReactionTab() {
  const dispatch = useDispatch()
  const notify = useNotify()
  const mechanismReactions = useSelector(
    (state) => state.mechanism.config.mechanism?.reactions || EMPTY_ARRAY
  )
  const table = useSelector((state) => state.conditions.table)
  const rowTimes = table.times
  const tableColumns = table.columns
  const rowReactionTypes = useSelector(
    (state) => state.conditions.rowReactionType || EMPTY_ROW_TAGS
  )

  const [reactionTypeId, setReactionTypeId] = useState(REACTION_TYPES[0].id)
  // The selected reactions, by id. A reaction without a configured name is listed under its
  // generated name (see rateReactionNames); its column is stored under its id either way.
  const [selectedReactionIds, setSelectedReactionIds] = useState(new Set())
  const [reactionSearch, setReactionSearch] = useState('')
  const [hideUnsetRows, setHideUnsetRows] = useState(false)
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

  const rateNames = useMemo(() => rateReactionNames(mechanismReactions), [mechanismReactions])
  const nameOf = (reaction) => rateNames.get(reaction.id) ?? ''

  const reactionType = REACTION_TYPES.find((t) => t.id === reactionTypeId)
  const isSurface = reactionTypeId === 'SURFACE'

  const reactionTypeCounts = REACTION_TYPES.map((type) => ({
    ...type,
    count: mechanismReactions.filter((reaction) => reaction.type === type.id).length,
  }))

  // Only offer reaction types that are present in the loaded mechanism.
  const presentReactionTypes = reactionTypeCounts.filter((type) => type.count > 0)

  const reactionsOfType = mechanismReactions.filter((reaction) => reaction.type === reactionTypeId)

  const reactionQuery = reactionSearch.trim().toLowerCase()
  const filteredReactionsOfType = reactionQuery
    ? reactionsOfType.filter((reaction) => nameOf(reaction).toLowerCase().includes(reactionQuery))
    : reactionsOfType

  // All the values of a non-surface type have the same unit. The surface properties have
  // different units, so each surface column shows its own.
  const valueUnit = isSurface ? null : rateParameterUnit(reactionType.prefix)

  // Selected reactions beyond the visible cap stay visible until deselected.
  const baseVisibleReactions = filteredReactionsOfType.slice(0, REACTIONS_VISIBLE)
  const overflowCandidateReactions = filteredReactionsOfType.slice(REACTIONS_VISIBLE)
  const pinnedOverflowReactions = overflowCandidateReactions.filter((reaction) =>
    selectedReactionIds.has(reaction.id)
  )
  const visibleReactionsOfType = [...baseVisibleReactions, ...pinnedOverflowReactions]
  const overflowReactionsOfType = overflowCandidateReactions.filter(
    (reaction) => !selectedReactionIds.has(reaction.id)
  )

  const toggleReaction = (id) => {
    setSelectedReactionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAllReactions = () => {
    const ids = reactionsOfType.map((reaction) => reaction.id)
    setSelectedReactionIds(new Set(ids.slice(0, REACTIONS_VISIBLE)))
    if (ids.length > MAX_SELECTED_REACTION) {
      notify.warning('Selection Limited', `Selected the first ${MAX_SELECTED_REACTION} of ${ids.length} reactions. Use search to select others.`)
    }
  }

  const handleDeselectAllReactions = () => {
    setSelectedReactionIds(new Set())
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
      (reaction) => reaction.type === reactionTypeId
    )
    setSelectedReactionIds((prev) => {
      const stillValid = [...prev].filter((id) =>
        currentReactionsOfType.some((reaction) => reaction.id === id)
      )
      if (stillValid.length > 0) return new Set(stillValid)
      return new Set(currentReactionsOfType.slice(0, DEFAULT_SELECTED_REACTIONS).map((r) => r.id))
    })
  }, [reactionTypeId, mechanismReactions])

  const selectedReactions = reactionsOfType.filter((reaction) =>
    selectedReactionIds.has(reaction.id)
  )

  // Each selected reaction contributes its own column. A surface reaction contributes one
  // column for each of its properties (effective radius, particle number concentration).
  // The column is stored under the reaction id (see rateColumns), so a rename keeps it.
  const columns = selectedReactions.flatMap((reaction) => {
    if (isSurface) {
      return surfacePropertiesOf(reaction.id, tableColumns).map((property) => ({
        key: rateColumnKey('SURF', reaction.id, property),
        label: `${nameOf(reaction)} ${property}`,
        unit: rateParameterUnit('SURF', property),
        // The header shows the reaction name once, over one sub-column for each property.
        groupId: reaction.id,
        groupLabel: nameOf(reaction),
        subLabel: property,
      }))
    }
    return [{ key: rateColumnKey(reactionType.prefix, reaction.id), label: nameOf(reaction), unit: valueUnit }]
  })

  // Consecutive columns of the same surface reaction share one header cell.
  const headerGroups = columns.reduce((groups, column) => {
    const last = groups[groups.length - 1]
    if (last && last.id === column.groupId) last.size += 1
    else groups.push({ id: column.groupId ?? column.key, label: column.groupLabel ?? column.label, size: 1 })
    return groups
  }, [])

  // Row indices where the active type already has a value, checked across every reaction of
  // that type (not just the ones currently selected), so toggling a sidebar checkbox never
  // makes a row flicker in/out.
  const typeDataIndices = new Set(
    reactionsOfType.flatMap((reaction) => {
      const keys = Object.keys(tableColumns || {}).filter(
        (key) => parseRateColumnKey(key)?.reactionId === reaction.id
      )

      return keys.flatMap((key) => {
        const series = tableColumns?.[key]
        if (!Array.isArray(series)) return []
        return series.flatMap((value, index) => (value != null ? [index] : []))
      })
    })
  )

  // A row shows under the active type if it has no type tags (added from Environment, or
  // predates this feature -- universal), was added/re-added under this type, or already has
  // data here.
  const typeTimeEntries = rowTimes
    .map((time, index) => ({ time, index }))
    .filter(({ time, index }) => {
      const tags = rowReactionTypes[String(time)]
      if (!Array.isArray(tags) || tags.length === 0 || tags.includes(reactionTypeId)) return true
      return typeDataIndices.has(index)
    })
  const shownColumnValues = columns.map((column) => tableColumns[column.key])
  const visibleTimeEntries = hideUnsetRows
    ? typeTimeEntries.filter(({ index }) => rowHasValues(shownColumnValues, index))
    : typeTimeEntries
  const removableIndices = visibleTimeEntries.map((entry) => entry.index)

  // Clear on rowTimes changing
  useEffect(() => {
    setRowDrafts({})
    setJustUpdatedCell(null)
    setSelectedIndices(new Set())
  }, [selectedReactionIds, reactionTypeId, rowTimes, hideUnsetRows])

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
      notify.invalidInput('Value must be a valid number zero or greater.')
      return
    }

    const existing = tableColumns[key] ?? []

    // Clicking into a cell and back out without typing anything shouldn't flash it or write to
    // Redux -- only an actual change counts as an update.
    const unchanged = existing[index] === parsed || (existing[index] == null && parsed == null)
    setRowDrafts((prev) => {
      const next = { ...prev }
      delete next[cellDraftKey(key, index)]
      return next
    })
    if (unchanged) return

    dispatch(setConditionsTable(setCell(table, key, index, parsed)))
    flashUpdated(cellDraftKey(key, index))
  }

  const TIME_DRAFT_KEY = '__time__'

  const commitTime = (index, rawValue) => {
    const outcome = commitTableTime(table, index, rawValue)

    if (outcome.kind === 'invalid') {
      // Leave the draft in place so the invalid text stays visible to fix, instead of
      // silently reverting to the last committed value.
      notify.invalidInput('Time must be a valid number zero or greater.')
      return
    }

    setRowDrafts((prev) => {
      const next = { ...prev }
      delete next[cellDraftKey(TIME_DRAFT_KEY, index)]
      return next
    })

    if (outcome.kind === 'unchanged') return
    if (outcome.kind === 'duplicate') {
      notify.error('Duplicate Time Point', `A time point already exists at t=${outcome.newTime}s.`)
      return
    }

    const { result } = outcome
    dispatch(setConditionsTable(result.table))
    dispatch(renameTimeRowTag({ oldTime: result.oldTime, newTime: result.newTime }))

    notify.success('Time Point Updated', `Moved time point to t=${result.newTime}s.`)
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
    // Only rows the user can see are removed, so a hidden row never disappears unseen.
    const result = removeTimeRows(
      table,
      [...selectedIndices].filter((index) => removableIndices.includes(index))
    )
    if (!result) return

    dispatch(setConditionsTable(result.table))
    dispatch(untagTimeRows(result.removedTimes))

    notify.removed(result.removedCount === 1 ? 'Time Point Removed' : 'Time Points Removed', `Removed ${result.removedCount} time point${result.removedCount === 1 ? '' : 's'}.`)
    setSelectedIndices(new Set())
  }

  const handleAddTimePoint = () => {
    const trimmed = newTimeValue.trim()
    const time = parseFloat(trimmed)
    if (trimmed === '' || isNaN(time) || time < 0) {
      notify.invalidInput('Time must be a valid number zero or greater.')
      return
    }

    if (rowTimes.includes(time)) {
      const tags = rowReactionTypes[String(time)]
      const alreadyVisibleHere = !Array.isArray(tags) || tags.length === 0 || tags.includes(reactionTypeId)
      if (alreadyVisibleHere) {
        notify.error('Duplicate Time Point', `A time point already exists at t=${time}s.`)
        return
      }

      // The row exists but was created under a different type and has no data of its own here
      // yet -- silently reveal it under this type too instead of refusing the add outright.
      dispatch(tagTimeRow({ time, typeId: reactionTypeId }))
      setNewTimeValue('')
      setAddTimeOpen(false)
      return
    }

    // t=0 is always the default starting point. The new row sets nothing, so the
    // environment holds its earlier values.
    const withZero = time === 0 ? table : ensureZeroTimeRow(table)
    dispatch(setConditionsTable(insertTimeRow(withZero, time).table))
    // Scopes this row to the active type until it also has data under another one (see
    // visibleTimeEntries above) -- so it's immediately visible here without leaking into
    // every other reaction type's table.
    dispatch(tagTimeRow({ time, typeId: reactionTypeId }))

    notify.success('Time Point Added', `Added time point at t=${time}s.`)
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
              Set time-varying rate constant parameters{valueUnit ? `, in ${valueUnit}` : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <HideUnsetRowsCheckbox checked={hideUnsetRows} onChange={setHideUnsetRows} />
            {/* Always mounted (just hidden) so the header's height never shifts */}
            <Button
              variant="glass"
              size="sm"
              onClick={handleRemoveSelected}
              className={`rounded-lg border-2 border-red-600 bg-white dark:bg-surface text-red-600 dark:text-danger hover:bg-red-50 dark:hover:bg-caution flex-shrink-0 ${
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
                className="rounded-lg border-2 border-assist-secondary-ring bg-white dark:bg-surface text-assist-secondary-ring hover:bg-assist-secondary"
              >
                Add
              </Button>

              {addTimeOpen && (
                <div className="absolute right-0 z-20 mt-1 w-40 bg-white dark:bg-surface border border-border rounded-lg shadow-lg p-3">
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
                      </button>
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

                  <div className="flex items-center gap-2 mb-2 pl-1">
                    <button
                      type="button"
                      onClick={handleSelectAllReactions}
                      className="text-sm text-action hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-sm text-muted">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllReactions}
                      className="text-sm text-action hover:underline"
                    >
                      Deselect all
                    </button>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    {visibleReactionsOfType.map((reaction) => (
                      <button
                        key={reaction.id}
                        type="button"
                        onClick={() => toggleReaction(reaction.id)}
                        className={filterButtonClass(selectedReactionIds.has(reaction.id))}
                      >
                        {nameOf(reaction)}
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
                          <div className="absolute z-20 mt-1 w-48 max-h-56 overflow-y-auto bg-white dark:bg-surface border border-border rounded-lg shadow-lg py-1">
                            {overflowReactionsOfType.map((reaction) => (
                              <button
                                key={reaction.id}
                                type="button"
                                onClick={() => toggleReaction(reaction.id)}
                                className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 text-ink hover:bg-surface-hover"
                              >
                                <Check
                                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                                    selectedReactionIds.has(reaction.id)
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  }`}
                                />
                                <span className="flex-1 truncate">{nameOf(reaction)}</span>
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
            <div className="border border-gray-200 dark:border-border rounded-lg overflow-auto lg:absolute lg:inset-0">
              {rowTimes.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-muted py-8">
                  No rate constant parameters configured
                </p>
              ) : typeTimeEntries.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-muted py-8">
                  No time points for {reactionType.label} yet. Click "Add" above to create one.
                </p>
              ) : columns.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-muted py-8">
                  Choose one or more reactions on the left to see their time-varying rate constant parameters.
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
                      <th rowSpan={isSurface ? 2 : 1} className="w-10 text-left px-4 py-2">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all time points"
                          className="accent-assist-secondary-ring"
                        />
                      </th>
                      <th rowSpan={isSurface ? 2 : 1} className="w-32 text-left px-4 py-2 font-semibold">
                        Time (s)
                      </th>
                      {/* No explicit width: table-layout: fixed divides the table's own width
                          equally across these columns. Below the table's min-width (set above),
                          that width is the full container, so they stretch to fill it; above it,
                          the table grows wider than the container and the wrapper scrolls.
                          A long name with no spaces wraps instead of running into the next
                          column. */}
                      {isSurface
                        ? headerGroups.map((group) => (
                            <th
                              key={group.id}
                              colSpan={group.size}
                              className="text-left px-4 py-2 font-semibold break-words"
                            >
                              {group.label}
                            </th>
                          ))
                        : columns.map((column) => (
                            <th key={column.key} className="text-left px-4 py-2 font-semibold break-words">
                              {column.label}
                              {column.unit && (
                                <span className="ml-1 font-normal whitespace-nowrap">({column.unit})</span>
                              )}
                            </th>
                          ))}
                    </tr>
                    {isSurface && (
                      <tr>
                        {columns.map((column) => (
                          <th key={column.key} className="text-left px-4 py-2 font-normal break-words">
                            {column.subLabel}
                            {column.unit && <span className="ml-1 whitespace-nowrap">({column.unit})</span>}
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {visibleTimeEntries.length === 0 && (
                      <tr>
                        <td colSpan={columns.length + 2} className="px-4 py-8 text-center text-gray-500 dark:text-muted">
                          No rows have values for the columns shown.
                        </td>
                      </tr>
                    )}
                    {visibleTimeEntries.map(({ time, index }) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-border hover:bg-gray-50 dark:hover:bg-surface-hover">
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
                            className={`${NUMBER_INPUT} focus:border-assist-secondary-ring border-gray-300 dark:border-border bg-white dark:bg-surface`}
                          />
                        </td>
                        {columns.map((column) => {
                          const stored = tableColumns?.[column.key]?.[index]
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
                                    : 'border-gray-300 dark:border-border bg-white dark:bg-surface'
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
