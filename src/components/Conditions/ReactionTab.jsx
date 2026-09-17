import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
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
 * Time-varying rate parameters for Photolysis/Surface/Emissions/Loss
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
  const [surfaceProperty, setSurfaceProperty] = useState('')
  const [rowDrafts, setRowDrafts] = useState({})
  const [justUpdatedIndex, setJustUpdatedIndex] = useState(null)

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

  useEffect(() => {
    setSurfaceProperty('')
  }, [reactionName, reactionTypeId])

  // Surface reactions vary by aerosol property (effective radius, particle number
  // concentration)
  const surfacePrefix = isSurface && reactionName ? `SURF.${reactionName}.` : null
  const availableSurfaceProperties = surfacePrefix
    ? Object.keys(additionalSeries || {})
        .filter((key) => key.startsWith(surfacePrefix))
        .map((key) => key.slice(surfacePrefix.length))
    : []

  const property = isSurface ? surfaceProperty.trim() : ''

  const bareKey = reactionName ? `${reactionType.prefix}.${reactionName}` : null
  const existingKey = bareKey
    ? Object.keys(additionalSeries || {}).find(
        (key) => key === bareKey || key.startsWith(`${bareKey}.`)
      )
    : null

  const seriesKey = reactionName
    ? isSurface
      ? property
        ? `SURF.${reactionName}.${property}`
        : null
      : (existingKey ?? bareKey)
    : null

  useEffect(() => {
    setRowDrafts({})
    setJustUpdatedIndex(null)
  }, [seriesKey])

  const seriesValues = seriesKey ? additionalSeries?.[seriesKey] : undefined

  const flashUpdated = (index) => {
    setJustUpdatedIndex(index)
    setTimeout(() => {
      setJustUpdatedIndex((current) => (current === index ? null : current))
    }, 600)
  }

  const handleValueChange = (index, value) => {
    setRowDrafts((prev) => ({ ...prev, [index]: value }))
  }

  const commitValue = (index, rawValue) => {
    if (!seriesKey) return

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

    const existing = Array.isArray(additionalSeries[seriesKey])
      ? [...additionalSeries[seriesKey]]
      : new Array(evolvingTimes.length).fill(null)
    while (existing.length < evolvingTimes.length) existing.push(null)
    existing[index] = parsed

    dispatch(setEvolvingAdditionalSeries({ ...additionalSeries, [seriesKey]: existing }))
    setRowDrafts((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
    flashUpdated(index)
  }

  return (
    <div className={EDITOR_GRID}>
      <Card className="w-[26rem]">
        <CardHeader>
          <CardTitle>Reaction rate</CardTitle>
          <CardDescription className="whitespace-nowrap">
            Choose a reaction to set its time-varying rate
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
            <label className={FIELD_LABEL}>Reaction</label>
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

          {isSurface && (
            <div className="w-full">
              <label className={FIELD_LABEL}>Property</label>
              <div className="flex flex-col gap-0.5">
                {availableSurfaceProperties.map((prop) => (
                  <button
                    key={prop}
                    type="button"
                    onClick={() => setSurfaceProperty(prop)}
                    className={filterButtonClass(property === prop)}
                  >
                    {stripPropertyUnit(prop)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {seriesKey && (
            <p className="text-xs text-gray-500 text-center break-all">Stored as {seriesKey}</p>
          )}
        </CardContent>
      </Card>

      <Card className={LIST_CARD}>
        <CardHeader>
          <CardTitle>
            {reactionName ? `${reactionName} rate over time` : 'Rate over time'}
          </CardTitle>
        </CardHeader>
        <CardContent className={LIST_CARD_CONTENT}>
          {evolvingTimes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No time points configured. Add time points in the Environment tab first.
            </p>
          ) : !seriesKey ? (
            <p className="text-center text-gray-500 py-8">
              {isSurface && reactionName && !property
                ? 'Name a property on the left to edit its time series.'
                : 'Choose a reaction on the left to see its time-varying rate.'}
            </p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-auto">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-assist-secondary text-assist-secondary-foreground">
                  <tr>
                    <th className="w-1/2 text-left px-4 py-2 font-semibold">Time (s)</th>
                    <th className="text-left px-4 py-2 font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {evolvingTimes.map((time, index) => {
                    const stored = seriesValues?.[index]
                    const displayValue =
                      rowDrafts[index] ?? (stored === null || stored === undefined ? '' : stored)
                    return (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono font-semibold">{time}</td>
                        <td className="px-4 py-2 font-mono">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={displayValue}
                            onChange={(e) => handleValueChange(index, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                commitValue(index, e.target.value)
                                e.target.blur()
                              }
                            }}
                            onBlur={(e) => commitValue(index, e.target.value)}
                            placeholder="not set"
                            className={`${NUMBER_INPUT} ${
                              justUpdatedIndex === index
                                ? 'border-action bg-assist-secondary'
                                : 'border-gray-300 bg-white'
                            }`}
                          />
                        </td>
                      </tr>
                    )
                  })}
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
