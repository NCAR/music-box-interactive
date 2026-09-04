import { useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { ChevronDown, ChevronUp, Check, Waypoints } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { getSpeciesDisplayName } from './speciesFormat'
import { computeIntegratedReactionRate, reactionReactants, reactionProducts } from './flowUtils'
import {
  canonicalReactionType,
  getReactionParameters,
  getReactionTypeLabel,
} from '../Mechanism/reactions/reactionRegistry'
import { REACTION_COMPONENT_KEYS } from '../../services/simulation/local/mechanism'
import { ITEM_PANEL } from '../Mechanism/fieldStyles'
import { RangeBoundInput, TIME_RANGE_UNITS } from './RangeBoundInput'
import { Card, CardContent } from '../ui/card'

// Species rows shown before the list collapses into a "+N others" popover.
const SPECIES_VISIBLE = 10

const SORT_OPTIONS = [
  { id: 'asc', label: 'Flux: Low to High' },
  { id: 'desc', label: 'Flux: High to Low' },
]

const formatComponents = (entries) => {
  if (!entries.length) return '∅'
  return entries
    .map((entry) => {
      const name = entry['species name'] || ''
      const coefficient = Number(entry.coefficient)
      const prefix = Number.isFinite(coefficient) && coefficient > 1 ? coefficient : ''
      return `${prefix}${name}`
    })
    .join(' + ')
}

const formatReactionFormula = (reaction) =>
  `${formatComponents(reactionReactants(reaction))} → ${formatComponents(reactionProducts(reaction))}`

// Exponential notation only where it helps: rate/flux values span many orders of magnitude.
const formatValue = (value) => {
  if (value === undefined || value === null || value === '') return '—'
  if (typeof value !== 'number') return String(value)
  if (!Number.isFinite(value) || value === 0) return '0'
  const magnitude = Math.abs(value)
  return magnitude < 1e-3 || magnitude >= 1e6 ? value.toExponential(2) : String(value)
}

// Structural fields aren't rate parameters; everything else on the reaction is shown as one.
const NON_PARAMETER_KEYS = new Set([
  'id',
  'type',
  'name',
  'gas phase',
  'gas-phase species',
  ...REACTION_COMPONENT_KEYS,
])

const reactionParameters = (reaction) => {
  const declared = getReactionParameters(reaction.type)
  const declaredKeys = declared.map((field) => field.key)

  const carried = Object.entries(reaction).filter(
    ([key, value]) =>
      !NON_PARAMETER_KEYS.has(key) &&
      !key.startsWith('__') &&
      value !== undefined &&
      value !== null &&
      value !== ''
  )

  return [
    ...declared.map((field) => ({ ...field, value: reaction[field.key] })),
    ...carried
      .filter(([key]) => !declaredKeys.includes(key))
      .map(([key, value]) => ({ key, value })),
  ]
}

// Collapsed: a rectangular chip showing the formula and flux. Click to expand into a panel
// with the reaction's type and rate parameters.
function FluxReactionChip({ reaction, flux }) {
  const [expanded, setExpanded] = useState(false)
  const formula = formatReactionFormula(reaction)
  const parameters = reactionParameters(reaction)

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`${ITEM_PANEL} text-left flex flex-col gap-1.5 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-assist-secondary-ring`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-semibold text-gray-900 break-words">
            {formula}
          </span>
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
        </div>
        <span className="text-sm text-gray-600">Flux: {formatValue(flux)} mol m⁻³</span>
      </button>
    )
  }

  return (
    <div className="w-full rounded-2xl border border-assist-secondary-border bg-assist-secondary p-4 ring-1 ring-assist-secondary-ring">
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="w-full flex items-center justify-center gap-1.5 rounded text-sm font-semibold font-mono text-assist-secondary-foreground break-words text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-assist-secondary-ring"
      >
        <span className="break-words">{formula}</span>
        <ChevronUp className="w-4 h-4 flex-shrink-0" />
      </button>

      <p className="mt-1 text-sm text-gray-600">Flux: {formatValue(flux)} mol m⁻³</p>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-gray-500 flex-shrink-0">Type</span>
          <span className="font-mono text-gray-800 truncate" title={reaction.type}>
            {reaction.type}
          </span>
        </div>
        {parameters.map((field) => (
          <div key={field.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-gray-500 flex-shrink-0">{field.key}</span>
            <span
              className="font-mono text-gray-800 truncate"
              title={String(formatValue(field.value))}
            >
              {formatValue(field.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/*
 * FluxAnalysis Component
 * Filter-and-browse view of reaction flux: a sidebar of reaction/species filters next to a
 * sortable grid of reaction cards, each showing its formula and integrated flux.
 */
export function FluxAnalysis() {
  const simulation = useSelector((state) => state.simulation)
  const reactions = useSelector((state) => state.mechanism.reactions)
  const duration = useSelector((state) => state.conditions.basic.duration)

  const [reactionsOpen, setReactionsOpen] = useState(true)
  const [speciesOpen, setSpeciesOpen] = useState(true)
  const [timeRangeOpen, setTimeRangeOpen] = useState(true)
  // Empty selection means "no filter applied" -- every reaction/species passes.
  const [selectedReactionTypes, setSelectedReactionTypes] = useState([])
  const [selectedSpeciesNames, setSelectedSpeciesNames] = useState([])
  const [speciesSearch, setSpeciesSearch] = useState('')
  const [speciesOverflowOpen, setSpeciesOverflowOpen] = useState(false)
  const [timeRange, setTimeRange] = useState({ start: 0, end: duration })
  const [timeRangeUnitId, setTimeRangeUnitId] = useState('seconds')
  const [timeRangeUnitMenuOpen, setTimeRangeUnitMenuOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState('desc')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)

  const speciesOverflowRef = useRef(null)
  const sortMenuRef = useRef(null)
  const timeRangeUnitMenuRef = useRef(null)
  useClickOutside(speciesOverflowRef, () => setSpeciesOverflowOpen(false), speciesOverflowOpen)
  useClickOutside(sortMenuRef, () => setSortMenuOpen(false), sortMenuOpen)
  useClickOutside(
    timeRangeUnitMenuRef,
    () => setTimeRangeUnitMenuOpen(false),
    timeRangeUnitMenuOpen
  )

  const timeRangeUnit =
    TIME_RANGE_UNITS.find((unit) => unit.id === timeRangeUnitId) ?? TIME_RANGE_UNITS[0]

  const speciesNames = useMemo(() => {
    const results = simulation.results
    if (!Array.isArray(results) || results.length === 0) return []
    const firstPoint = results[0]
    const keys =
      firstPoint?.concentrations && typeof firstPoint.concentrations === 'object'
        ? Object.keys(firstPoint.concentrations)
        : Object.keys(firstPoint).filter(
            (key) => key !== 'time' && key !== 'timestamp' && key !== 'date' && key !== 'concentrations'
          )
    return keys.map(getSpeciesDisplayName)
  }, [simulation.results])

  const filteredSpeciesNames = useMemo(() => {
    const search = speciesSearch.trim().toLowerCase()
    if (!search) return speciesNames
    return speciesNames.filter((name) => name.toLowerCase().startsWith(search))
  }, [speciesNames, speciesSearch])

  const visibleSpeciesNames = filteredSpeciesNames.slice(0, SPECIES_VISIBLE)
  const overflowSpeciesNames = filteredSpeciesNames.slice(SPECIES_VISIBLE)

  const toggleReactionType = (type) => {
    setSelectedReactionTypes((current) =>
      current.includes(type) ? current.filter((x) => x !== type) : [...current, type]
    )
  }

  const toggleSpecies = (name) => {
    setSelectedSpeciesNames((current) =>
      current.includes(name) ? current.filter((x) => x !== name) : [...current, name]
    )
  }

  const resetFilters = () => {
    setSelectedReactionTypes([])
    setSelectedSpeciesNames([])
    setSpeciesSearch('')
    setTimeRange({ start: 0, end: duration })
  }

  const reactionTypeCounts = useMemo(() => {
    const counts = new Map()
    for (const reaction of reactions ?? []) {
      const type = canonicalReactionType(reaction.type || 'UNKNOWN')
      counts.set(type, (counts.get(type) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count, label: getReactionTypeLabel(type) }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [reactions])

  const reactionInvolvesSpecies = (reaction) => {
    if (selectedSpeciesNames.length === 0) return true
    const names = [...reactionReactants(reaction), ...reactionProducts(reaction)].map(
      (entry) => entry['species name']
    )
    return names.some((name) => selectedSpeciesNames.includes(name))
  }

  const visibleReactions = useMemo(() => {
    if (!Array.isArray(reactions)) return []

    const timeStart = timeRange.start ?? 0
    const timeEnd = timeRange.end ?? duration ?? Infinity

    return reactions
      .map((reaction, index) => ({ reaction, index }))
      .filter(
        ({ reaction }) =>
          (selectedReactionTypes.length === 0 ||
            selectedReactionTypes.includes(canonicalReactionType(reaction.type))) &&
          reactionInvolvesSpecies(reaction)
      )
      .map(({ reaction, index }) => ({
        reaction,
        flux: computeIntegratedReactionRate(
          reaction,
          index,
          simulation.excludedResults,
          timeStart,
          timeEnd
        ),
      }))
      .sort((a, b) => (sortOrder === 'asc' ? a.flux - b.flux : b.flux - a.flux))
  }, [
    reactions,
    selectedReactionTypes,
    selectedSpeciesNames,
    simulation.excludedResults,
    duration,
    timeRange.start,
    timeRange.end,
    sortOrder,
  ])

  if (!simulation.results || simulation.status !== 'succeeded') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-gray-500">
            <div className="flex justify-center mb-2">
              <Waypoints className="w-12 h-12" />
            </div>
            <p>Run a simulation to see flux analysis</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const sortOption = SORT_OPTIONS.find((option) => option.id === sortOrder) ?? SORT_OPTIONS[0]

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between pt-3">
          <div className="flex items-center gap-2 text-sm text-gray-800">
            <button type="button" onClick={resetFilters} className="text-green-700 hover:underline">
              Reset
            </button>
          </div>

          <div className="relative" ref={sortMenuRef}>
            <button
              type="button"
              onClick={() => setSortMenuOpen((open) => !open)}
              className="flex items-center gap-1 text-sm text-gray-800 hover:text-gray-900"
            >
              {sortOption.label}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {sortMenuOpen && (
              <div className="absolute right-0 z-10 mt-1 w-44 bg-white border border-gray-300 rounded-lg shadow-lg py-1">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setSortOrder(option.id)
                      setSortMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 text-gray-800 hover:bg-gray-100"
                  >
                    <Check
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        sortOrder === option.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sidebar filters */}
          <div className="w-full lg:w-64 flex-shrink-0 space-y-5">
            <div>
              <button
                type="button"
                onClick={() => setReactionsOpen((open) => !open)}
                className="w-full flex items-center justify-between text-sm font-bold text-gray-900 mb-2"
              >
                Reactions
                {reactionsOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {reactionsOpen && (
                <div className="max-h-64 overflow-y-auto flex flex-col gap-0.5 pr-1">
                  {reactionTypeCounts.map(({ type, count, label }) => {
                    const selected = selectedReactionTypes.includes(type)
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleReactionType(type)}
                        className={`text-left text-sm px-1.5 py-1 rounded ${
                          selected
                            ? 'text-assist-secondary-foreground font-semibold bg-assist-secondary'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {label} ({count})
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setSpeciesOpen((open) => !open)}
                className="w-full flex items-center justify-between text-sm font-bold text-gray-900 mb-2"
              >
                Species
                {speciesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {speciesOpen && (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={speciesSearch}
                    onChange={(e) => {
                      setSpeciesSearch(e.target.value)
                      setSpeciesOverflowOpen(false)
                    }}
                    placeholder="Search species"
                    className="w-full h-8 px-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />

                  <div className="flex flex-col gap-0.5">
                    {visibleSpeciesNames.map((name) => {
                      const selected = selectedSpeciesNames.includes(name)
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleSpecies(name)}
                          className={`text-left text-sm px-1.5 py-1 rounded ${
                            selected
                              ? 'text-assist-secondary-foreground font-semibold bg-assist-secondary'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {name}
                        </button>
                      )
                    })}

                    {overflowSpeciesNames.length > 0 && (
                      <div className="relative" ref={speciesOverflowRef}>
                        <button
                          type="button"
                          onClick={() => setSpeciesOverflowOpen((open) => !open)}
                          className="text-left text-sm px-1.5 py-1 rounded text-gray-500 hover:bg-gray-50"
                        >
                          +{overflowSpeciesNames.length} others
                        </button>

                        {speciesOverflowOpen && (
                          <div className="absolute z-20 mt-1 w-48 max-h-56 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg py-1">
                            {overflowSpeciesNames.map((name) => {
                              const selected = selectedSpeciesNames.includes(name)
                              return (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => toggleSpecies(name)}
                                  className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 text-gray-800 hover:bg-gray-100"
                                >
                                  <Check
                                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                                      selected ? 'opacity-100' : 'opacity-0'
                                    }`}
                                  />
                                  <span className="flex-1 truncate">{name}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setTimeRangeOpen((open) => !open)}
                className="w-full flex items-center justify-between text-sm font-bold text-gray-900 mb-2"
              >
                Time Range
                {timeRangeOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {timeRangeOpen && (
                <div className="flex flex-col gap-2">
                  <div className="relative" ref={timeRangeUnitMenuRef}>
                    <button
                      type="button"
                      onClick={() => setTimeRangeUnitMenuOpen((open) => !open)}
                      className="flex items-center justify-between gap-1 w-full h-8 px-2 border border-gray-300 rounded-lg text-sm text-gray-800 hover:bg-gray-50"
                    >
                      {timeRangeUnit.label}
                      <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                    </button>

                    {timeRangeUnitMenuOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg py-1">
                        {TIME_RANGE_UNITS.map((unit) => (
                          <button
                            key={unit.id}
                            type="button"
                            onClick={() => {
                              setTimeRangeUnitId(unit.id)
                              setTimeRangeUnitMenuOpen(false)
                            }}
                            className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 text-gray-800 hover:bg-gray-100"
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

                  <div className="flex items-center border border-gray-300 rounded-lg bg-white">
                    <RangeBoundInput
                      value={timeRange.start}
                      divisor={timeRangeUnit.divisor}
                      min={0}
                      max={timeRange.end}
                      onCommit={(start) => setTimeRange({ start, end: timeRange.end })}
                      className="w-1/2 h-8 px-2 bg-white text-gray-900 rounded-l-lg text-sm text-center focus:outline-none focus:relative focus:z-10 focus:ring-2 focus:ring-blue-600"
                    />
                    <span className="flex items-center justify-center h-8 px-1 text-gray-400 font-normal bg-white">
                      –
                    </span>
                    <RangeBoundInput
                      value={timeRange.end}
                      divisor={timeRangeUnit.divisor}
                      min={timeRange.start}
                      max={duration}
                      onCommit={(end) => setTimeRange({ start: timeRange.start, end })}
                      className="w-1/2 h-8 px-2 bg-white text-gray-900 rounded-r-lg text-sm text-center focus:outline-none focus:relative focus:z-10 focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reaction chips */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 content-start items-start">
            {visibleReactions.length === 0 ? (
              <p className="text-sm text-gray-500 col-span-full">
                No reactions match the current filters.
              </p>
            ) : (
              visibleReactions.map(({ reaction, flux }) => (
                <FluxReactionChip key={reaction.id} reaction={reaction} flux={flux} />
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
