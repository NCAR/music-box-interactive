import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { setEvolvingAdditionalSeries } from '../../redux/slices/conditionsSlice'
import { useToast } from '@/hooks/use-toast'
import { LIST_CARD, LIST_CARD_CONTENT, FIELD_LABEL, TEXT_INPUT_SM } from '../Mechanism/fieldStyles'
import { canonicalReactionType } from '../Mechanism/reactions/reactionRegistry'

const EDITOR_GRID = 'grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr] lg:items-start'

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

const REACTION_TYPES = [
  { id: 'PHOTOLYSIS', label: 'Photolysis', prefix: 'PHOTO' },
  { id: 'SURFACE_REACTION', label: 'Surface', prefix: 'SURF' },
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
  const mechanismReactions = useSelector((state) => state.mechanism.reactions)
  const evolvingTimes = useSelector((state) => state.conditions.evolving.times)
  const additionalSeries = useSelector((state) => state.conditions.evolving.additionalSeries)

  const [reactionTypeId, setReactionTypeId] = useState(REACTION_TYPES[0].id)
  const [reactionName, setReactionName] = useState('')
  const [reactionSearch, setReactionSearch] = useState('')
  const [rowDrafts, setRowDrafts] = useState({})
  const [justUpdatedCell, setJustUpdatedCell] = useState(null)
  const [selectedIndices, setSelectedIndices] = useState(new Set())

  const reactionType = REACTION_TYPES.find((t) => t.id === reactionTypeId)
  const isSurface = reactionTypeId === 'SURFACE_REACTION'

  const reactionTypeCounts = REACTION_TYPES.map((type) => ({
    ...type,
    count: mechanismReactions.filter((reaction) => canonicalReactionType(reaction.type) === type.id)
      .length,
  }))

  const reactionsOfType = mechanismReactions.filter(
    (reaction) => canonicalReactionType(reaction.type) === reactionTypeId
  )

  const reactionQuery = reactionSearch.trim().toLowerCase()
  const visibleReactionsOfType = reactionQuery
    ? reactionsOfType.filter((reaction) => reaction.name.toLowerCase().includes(reactionQuery))
    : reactionsOfType

  useEffect(() => {
    if (!reactionsOfType.some((reaction) => reaction.name === reactionName)) {
      setReactionName(reactionsOfType[0]?.name ?? '')
    }

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

  useEffect(() => {
    setRowDrafts({})
    setJustUpdatedCell(null)
    setSelectedIndices(new Set())
  }, [reactionName, reactionTypeId])

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
    <div className={EDITOR_GRID}>
      <Card className="w-[26rem]">
        <CardHeader>
          <CardTitle>Rate constant parameter</CardTitle>
          <CardDescription className="whitespace-nowrap">
            Set time-varying rate constant parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-full">
            <label className={FIELD_LABEL}>Reaction type</label>
            <div className="flex flex-col gap-0.5">
              {reactionTypeCounts.map((type) => (
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
          </div>

          <div className="w-full">
            <label className={FIELD_LABEL}>Rate constant paramaters</label>
            <input
              type="text"
              value={reactionSearch}
              onChange={(e) => setReactionSearch(e.target.value)}
              placeholder="Search by name"
              className={`w-full mb-2 ${TEXT_INPUT_SM}`}
            />
            <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
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
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={LIST_CARD}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>
              {reactionName
                ? `${reactionName}`
                : 'Rate constant parameter over time'}
            </CardTitle>
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
            <div className="border border-gray-200 rounded-lg overflow-auto">
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
                    <th className="text-left px-4 py-2 font-semibold">Time (s)</th>
                    {columns.map((column) => (
                      <th key={column.key} className="text-left px-4 py-2 font-semibold">
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
                              onChange={(e) => handleValueChange(column.key, index, e.target.value)}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ReactionTab
