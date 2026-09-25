import { useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { setEvolvingAdditionalSeries } from '../../redux/slices/conditionsSlice'
import { useToast } from '@/hooks/use-toast'
import { useClickOutside } from '../../hooks/useClickOutside'
import { EMPTY_ARRAY } from '../../utils/emptyArray'
import { LIST_CARD, LIST_CARD_CONTENT, TEXT_INPUT_SM } from '../Mechanism/fieldStyles'

const filterButtonClass = (selected) =>
  `w-full text-left text-sm px-1.5 py-1 rounded ${
    selected
      ? 'text-assist-secondary-foreground font-semibold bg-assist-secondary'
      : 'text-muted hover:bg-surface-hover'
  }`

const NUMBER_INPUT =
  'w-full h-9 px-2 border rounded text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-action transition-colors duration-300'

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

// Reaction names shown before the list collapses into a "+N others" popover.
const REACTIONS_VISIBLE = 13

const REACTION_TYPES = [
  { id: 'PHOTOLYSIS', label: 'Photolysis', prefix: 'PHOTO' },
  { id: 'SURFACE', label: 'Surface', prefix: 'SURF' },
  { id: 'EMISSION', label: 'Emissions', prefix: 'EMIS' },
  { id: 'FIRST_ORDER_LOSS', label: 'Loss', prefix: 'LOSS' },
]

/**
 * ReactionTab Component
 * Time-varying rate parameters for Photolysis/Surface/Emissions/Loss reactions 
 */
export function ReactionTab() {
  const dispatch = useDispatch()
  const { toast } = useToast()
  const mechanismReactions = useSelector(
    (state) => state.mechanism.config.mechanism?.reactions || EMPTY_ARRAY
  )
  const evolvingTimes = useSelector((state) => state.conditions.evolving.times)
  const additionalSeries = useSelector((state) => state.conditions.evolving.additionalSeries)

  const [reactionTypeId, setReactionTypeId] = useState(REACTION_TYPES[0].id)
  const [reactionName, setReactionName] = useState('')
  const [reactionSearch, setReactionSearch] = useState('')
  const [rowDrafts, setRowDrafts] = useState({})
  const [justUpdatedCell, setJustUpdatedCell] = useState(null)
  const [selectedIndices, setSelectedIndices] = useState(new Set())
  const [reactionSectionOpen, setReactionSectionOpen] = useState(true)
  const [rateConstantSectionOpen, setRateConstantSectionOpen] = useState(true)
  const [reactionOverflowOpen, setReactionOverflowOpen] = useState(false)
  const reactionOverflowRef = useRef(null)
  useClickOutside(reactionOverflowRef, () => setReactionOverflowOpen(false), reactionOverflowOpen)

  const reactionType = REACTION_TYPES.find((t) => t.id === reactionTypeId)
  const isSurface = reactionTypeId === 'SURFACE'

  const reactionTypeCounts = REACTION_TYPES.map((type) => ({
    ...type,
    count: mechanismReactions.filter(
      (reaction) => reaction.type === type.id && hasName(reaction)
    ).length,
  }))

  // Only offer reaction types that are actually present in the loaded mechanism.
  const presentReactionTypes = reactionTypeCounts.filter((type) => type.count > 0)

  const reactionsOfType = mechanismReactions.filter(
    (reaction) => reaction.type === reactionTypeId && hasName(reaction)
  )

  const reactionQuery = reactionSearch.trim().toLowerCase()
  const filteredReactionsOfType = reactionQuery
    ? reactionsOfType.filter((reaction) => reaction.name.toLowerCase().includes(reactionQuery))
    : reactionsOfType

  // A selected reaction beyond the visible cap stays visible until a different one is chosen.
  const baseVisibleReactions = filteredReactionsOfType.slice(0, REACTIONS_VISIBLE)
  const overflowCandidateReactions = filteredReactionsOfType.slice(REACTIONS_VISIBLE)
  const pinnedOverflowReactions = overflowCandidateReactions.filter(
    (reaction) => reaction.name === reactionName
  )
  const visibleReactionsOfType = [...baseVisibleReactions, ...pinnedOverflowReactions]
  const overflowReactionsOfType = overflowCandidateReactions.filter(
    (reaction) => reaction.name !== reactionName
  )

  // Keep the selected type pointed at one that's actually present, falling back to the first
  // available type when the mechanism changes out from under the current selection.
  useEffect(() => {
    if (presentReactionTypes.some((type) => type.id === reactionTypeId)) return
    if (presentReactionTypes.length > 0) setReactionTypeId(presentReactionTypes[0].id)
  }, [presentReactionTypes, reactionTypeId])

  // Recomputes from its actual source deps (mechanismReactions/reactionTypeId) rather than
  // depending on the derived reactionsOfType array
  useEffect(() => {
    const currentReactionsOfType = mechanismReactions.filter(
      (reaction) => reaction.type === reactionTypeId && hasName(reaction)
    )
    setReactionName((prev) =>
      currentReactionsOfType.some((reaction) => reaction.name === prev)
        ? prev
        : (currentReactionsOfType[0]?.name ?? '')
    )
  }, [reactionTypeId, mechanismReactions])

  const surfacePrefix = isSurface && reactionName ? `SURF.${reactionName}.` : null
  const availableSurfaceProperties = surfacePrefix
    ? Object.keys(additionalSeries || {}).filter((key) => key.startsWith(surfacePrefix))
    : []

  const bareKey = reactionName && !isSurface ? `${reactionType.prefix}.${reactionName}` : null
  const existingKey = bareKey
    ? Object.keys(additionalSeries || {}).find(
        (key) => key === bareKey || key.startsWith(`${bareKey}.`)
      )
    : null

  const columns = reactionName
    ? isSurface
      ? availableSurfaceProperties.map((key) => ({
          key,
          label: stripPropertyUnit(key.slice(surfacePrefix.length)),
        }))
      : [{ key: existingKey ?? bareKey, label: 'Value' }]
    : []

  // Clear on evolvingTimes changing
  useEffect(() => {
    setRowDrafts({})
    setJustUpdatedCell(null)
    setSelectedIndices(new Set())
  }, [reactionName, reactionTypeId, evolvingTimes])

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
    existing[index] = parsed

    dispatch(setEvolvingAdditionalSeries({ ...additionalSeries, [key]: existing }))
    setRowDrafts((prev) => {
      const next = { ...prev }
      delete next[cellDraftKey(key, index)]
      return next
    })
    flashUpdated(cellDraftKey(key, index))
  }

  const toggleSelected = (index) => {
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

  const allSelected = evolvingTimes.length > 0 && evolvingTimes.every((_, i) => selectedIndices.has(i))

  const toggleSelectAll = () => {
    setSelectedIndices((prev) =>
      prev.size === evolvingTimes.length ? new Set() : new Set(evolvingTimes.map((_, i) => i))
    )
  }

  const handleClearSelected = () => {
    if (selectedIndices.size === 0 || columns.length === 0) return

    const nextSeries = { ...additionalSeries }
    columns.forEach((column) => {
      const existing = Array.isArray(additionalSeries[column.key])
        ? [...additionalSeries[column.key]]
        : new Array(evolvingTimes.length).fill(null)
      while (existing.length < evolvingTimes.length) existing.push(null)
      selectedIndices.forEach((index) => {
        existing[index] = null
      })
      nextSeries[column.key] = existing
    })

    dispatch(setEvolvingAdditionalSeries(nextSeries))
    toast({
      title: 'Values Cleared',
      description: `Cleared ${selectedIndices.size} time point${selectedIndices.size === 1 ? '' : 's'}`,
      variant: 'delete',
    })
    setSelectedIndices(new Set())
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
          {/* Always mounted (just hidden) so the header's height never shifts when the
              first checkbox is checked. */}
          <Button
            variant="glass"
            size="sm"
            onClick={handleClearSelected}
            className={`rounded-lg bg-white text-red-600 hover:bg-red-50 flex-shrink-0 ${
              selectedIndices.size === 0 ? 'invisible' : ''
            }`}
          >
            Clear selected ({selectedIndices.size})
          </Button>
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
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setReactionTypeId(type.id)}
                      className={filterButtonClass(reactionTypeId === type.id)}
                    >
                      {type.label} ({type.count})
                    </button>
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
                    className={`w-full !h-8 mb-2 ${TEXT_INPUT_SM}`}
                  />
                  <div className="flex flex-col gap-0.5">
                    {visibleReactionsOfType.map((reaction) => (
                      <button
                        key={reaction.id ?? reaction.name}
                        type="button"
                        onClick={() => setReactionName(reaction.name)}
                        className={filterButtonClass(reactionName === reaction.name)}
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
                                onClick={() => {
                                  setReactionName(reaction.name)
                                  setReactionOverflowOpen(false)
                                }}
                                className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 text-ink hover:bg-surface-hover"
                              >
                                <Check
                                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                                    reactionName === reaction.name ? 'opacity-100' : 'opacity-0'
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
                  No time points configured. Add time points in the Environment tab first.
                </p>
              ) : columns.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {isSurface && reactionName
                    ? 'No properties loaded yet for this reaction.'
                    : 'Choose a reaction on the left to see its time-varying rate constant parameter.'}
                </p>
              ) : (
                <table className="w-full table-fixed text-sm">
                  <thead className="bg-assist-secondary text-assist-secondary-foreground">
                    <tr>
                      <th className="w-10 px-4 py-2">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all time points"
                          className="accent-action"
                        />
                      </th>
                      <th className="w-32 text-left px-4 py-2 font-semibold">Time (s)</th>
                      {columns.map((column) => (
                        <th key={column.key} className="w-40 text-left px-4 py-2 font-semibold">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evolvingTimes.map((time, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIndices.has(index)}
                            onChange={() => toggleSelected(index)}
                            aria-label={`Select time point at t=${time}s`}
                            className="accent-action"
                          />
                        </td>
                        <td className="px-4 py-2 font-mono font-semibold">{time}</td>
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
                                className={`${NUMBER_INPUT} ${
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
