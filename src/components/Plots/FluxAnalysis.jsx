import { useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Filter, ChevronDown, ChevronUp, Check, Waypoints } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { getSpeciesDisplayName } from './speciesFormat'
import { computeIntegratedReactionRate, reactionReactants, reactionProducts } from './flowUtils'
import { Card, CardContent } from '../ui/card'

// Species rows shown before the list collapses into a "+N others" popover.
const SPECIES_VISIBLE = 5

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

// Exponential notation only where it helps: flux values span many orders of magnitude.
const formatFlux = (value) => {
  if (!Number.isFinite(value) || value === 0) return '0'
  const magnitude = Math.abs(value)
  return magnitude < 1e-3 || magnitude >= 1e6 ? value.toExponential(2) : String(value)
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
  // Empty selection means "no filter applied" -- every reaction/species passes.
  const [selectedReactionIds, setSelectedReactionIds] = useState([])
  const [selectedSpeciesNames, setSelectedSpeciesNames] = useState([])
  const [speciesSearch, setSpeciesSearch] = useState('')
  const [speciesOverflowOpen, setSpeciesOverflowOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState('asc')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)

  const speciesOverflowRef = useRef(null)
  const sortMenuRef = useRef(null)
  useClickOutside(speciesOverflowRef, () => setSpeciesOverflowOpen(false), speciesOverflowOpen)
  useClickOutside(sortMenuRef, () => setSortMenuOpen(false), sortMenuOpen)

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

  const toggleReaction = (id) => {
    setSelectedReactionIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    )
  }

  const toggleSpecies = (name) => {
    setSelectedSpeciesNames((current) =>
      current.includes(name) ? current.filter((x) => x !== name) : [...current, name]
    )
  }

  const resetFilters = () => {
    setSelectedReactionIds([])
    setSelectedSpeciesNames([])
    setSpeciesSearch('')
  }

  const reactionInvolvesSpecies = (reaction) => {
    if (selectedSpeciesNames.length === 0) return true
    const names = [...reactionReactants(reaction), ...reactionProducts(reaction)].map(
      (entry) => entry['species name']
    )
    return names.some((name) => selectedSpeciesNames.includes(name))
  }

  const visibleReactions = useMemo(() => {
    if (!Array.isArray(reactions)) return []

    const timeStart = 0
    const timeEnd = duration ?? Infinity

    return reactions
      .map((reaction, index) => ({ reaction, index }))
      .filter(
        ({ reaction }) =>
          (selectedReactionIds.length === 0 || selectedReactionIds.includes(reaction.id)) &&
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
    selectedReactionIds,
    selectedSpeciesNames,
    simulation.excludedResults,
    duration,
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Filter className="w-4 h-4" />
            Filter
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={resetFilters}
              className="text-blue-600 hover:underline font-semibold"
            >
              Reset
            </button>
          </div>

          <div className="relative" ref={sortMenuRef}>
            <button
              type="button"
              onClick={() => setSortMenuOpen((open) => !open)}
              className="flex items-center gap-1 text-sm font-semibold text-gray-800 hover:text-gray-900"
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
                  {(reactions ?? []).map((reaction) => {
                    const formula = formatReactionFormula(reaction)
                    const selected = selectedReactionIds.includes(reaction.id)
                    return (
                      <button
                        key={reaction.id}
                        type="button"
                        onClick={() => toggleReaction(reaction.id)}
                        title={formula}
                        className={`text-left text-sm font-mono truncate px-1.5 py-1 rounded ${
                          selected
                            ? 'text-blue-600 font-semibold bg-blue-50'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {formula}
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
                              ? 'text-blue-600 font-semibold bg-blue-50'
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
          </div>

          {/* Reaction cards */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 content-start">
            {visibleReactions.length === 0 ? (
              <p className="text-sm text-gray-500 col-span-full">
                No reactions match the current filters.
              </p>
            ) : (
              visibleReactions.map(({ reaction, flux }) => (
                <div
                  key={reaction.id}
                  className="rounded-2xl border border-gray-300 bg-white p-4 flex flex-col gap-1.5"
                >
                  <span className="font-mono text-sm font-semibold text-gray-900 break-words">
                    {formatReactionFormula(reaction)}
                  </span>
                  <span className="text-sm text-gray-600">Flux: {formatFlux(flux)} mol m⁻³</span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
