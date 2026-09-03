import { useState, useEffect } from 'react'
import {
  computeIntegratedReactionRate,
  getReactionEdges,
  getThirdBodyNames,
  isReactionVisible,
  matchesReactionType,
} from './flowUtils'
import { FlowPanel } from './FlowPanel'
import { useSelector } from 'react-redux'
import { Card, CardContent } from '../ui/card'
import { Waypoints } from 'lucide-react'

/*
 * FluxAnalysis Component
 * Same controls as FlowDiagram (species/reaction filters, time range, flux range)
 * without the rendered graph or notes -- a controls-only view of flux data.
 */

export function FluxAnalysis() {
  const [arrowScaling, setArrowScaling] = useState('logarithmic')
  const [valueDisplay, setValueDisplay] = useState('absolute')

  const duration = useSelector((state) => state.conditions.basic.duration)
  const [timeRange, setTimeRange] = useState({ start: 0, end: duration })

  // Placeholder only: the effect below derives the real min/max from the selected reactions.
  // Not seeded with hardcoded magnitudes -- those are mechanism-specific, so any fixed pair
  // displays fabricated numbers for every mechanism but the one they were measured from.
  const [rateRange, setRateRange] = useState({ start: 0, end: 0 })

  const [selectedSpecies, setSelectedSpecies] = useState([])
  const [reactionType, setReactionType] = useState('')

  // If no simulation results, show placeholder
  const simulation = useSelector((state) => state.simulation)
  const reactions = useSelector((state) => state.mechanism.reactions)
  const species = useSelector((state) => state.mechanism.species)

  // The integrated reaction rate depends on the selected time window, so its magnitude
  // changes with the time range and species selection. The range must therefore be
  // recalculated whenever either changes to avoid stale scaling that can mute edges.
  useEffect(() => {
    if (!reactions || reactions.length === 0) return
    if (!selectedSpecies || selectedSpecies.length === 0) return

    const thirdBodyNames = getThirdBodyNames(species)

    // Capture each reaction's index before filtering -- tracer keys are index-based, so an
    // index taken from the filtered array would read the wrong reaction's tracer.
    const visibleReactions = reactions
      .map((reaction, index) => ({ reaction, index }))
      .filter(
        ({ reaction }) =>
          isReactionVisible(reaction, selectedSpecies, thirdBodyNames) &&
          matchesReactionType(reaction, reactionType)
      )

    if (visibleReactions.length === 0) return

    const timeStart = timeRange.start ?? 0
    const timeEnd = timeRange.end ?? Infinity

    // Range over EDGE values, not per-reaction rates: edges carry `coefficient x rate`, so a
    // range built from bare rates would sit below any coefficient > 1 edge and mute it.
    const edgeValues = visibleReactions.flatMap(({ reaction, index }) => {
      const rate = computeIntegratedReactionRate(
        reaction,
        index,
        simulation.excludedResults,
        timeStart,
        timeEnd
      )
      return getReactionEdges(reaction, rate, thirdBodyNames).map((edge) => edge.value)
    })

    if (edgeValues.length === 0) return

    const min = Math.min(...edgeValues)
    const max = Math.max(...edgeValues)

    if (isFinite(min) && isFinite(max)) {
      setRateRange({ start: min, end: max })
    }
  }, [
    reactions,
    species,
    simulation.excludedResults,
    selectedSpecies,
    reactionType,
    timeRange.start,
    timeRange.end,
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

  return (
    <Card>
      <CardContent className="space-y-3 xs:space-y-4">
        <FlowPanel
          arrowScaling={arrowScaling}
          setArrowScaling={setArrowScaling}
          range={timeRange}
          setRange={setTimeRange}
          rateRange={rateRange}
          setRateRange={setRateRange}
          selectedSpecies={selectedSpecies}
          reactionType={reactionType}
          setReactionType={setReactionType}
          setSelectedSpecies={setSelectedSpecies}
          valueDisplay={valueDisplay}
          setValueDisplay={setValueDisplay}
        />
      </CardContent>
    </Card>
  )
}
