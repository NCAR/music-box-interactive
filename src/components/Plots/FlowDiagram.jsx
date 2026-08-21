import { React, useState, useEffect } from 'react'
import { FlowGraph } from './FlowGraph'
import {
  computeIntegratedReactionRate,
  getReactionEdges,
  getThirdBodyNames,
  isReactionVisible,
} from './flowUtils'
import { FlowPanel } from './FlowPanel'
import { useSelector } from 'react-redux'
import { Card, CardContent, CardDescription } from '../ui/card'
import { Waypoints, StickyNote } from 'lucide-react'

/*
 * FlowDiagram Component
 * Visualizes the flow of chemical species and reactions in a diagram format.
 * Owns all shared state and passes it down to FlowPanel (controls) and FlowGraph (rendering).
 */

export function FlowDiagram() {
  const [arrowScaling, setArrowScaling] = useState('logarithmic')
  const [valueDisplay, setValueDisplay] = useState('absolute')

  // Fixed spread between the thinnest and thickest edges (BASE=2px up to MAX_ARROW_WIDTH+2px)
  const MAX_ARROW_WIDTH = 4

  const duration = useSelector((state) => state.conditions.basic.duration)
  const [timeRange, setTimeRange] = useState({ start: 0, end: duration })

  // const example = useSelector((state) => state);
  // console.log('FlowPanel example state:', example);

  // Placeholder only: the effect below derives the real min/max from the selected reactions.
  // Not seeded with hardcoded magnitudes -- those are mechanism-specific, so any fixed pair
  // displays fabricated numbers for every mechanism but the one they were measured from.
  const [rateRange, setRateRange] = useState({ start: 0, end: 0 })

  const [selectedSpecies, setSelectedSpecies] = useState([])

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
      .filter(({ reaction }) => isReactionVisible(reaction, selectedSpecies, thirdBodyNames))

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
    timeRange.start,
    timeRange.end,
  ])
  if (!simulation.results || simulation.status !== 'succeeded') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-white-500">
            <div className="flex justify-center mb-2">
              <Waypoints className="w-12 h-12" />
            </div>
            <p>Run a simulation to see flow diagrams</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="space-y-3 xs:space-y-4">
        {/* Note Box */}
        <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50/40 border border-blue-200 rounded-lg p-3 mt-2 xs:mt-3 sm:mt-4">
          <StickyNote className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <CardDescription className="text-base font-semibold">Notes:</CardDescription>
            <CardDescription className="text-base flex gap-2">
              <span>•</span>
              <span>
                Each arrow shows the integrated reaction rate over the selected time range —
                the reaction rate integrated over time, in mol m-3. It measures how much the
                reaction itself turned over, not the net change of any one species.
              </span>
            </CardDescription>
            <CardDescription className="text-base flex gap-2">
              <span>•</span>
              <span>Absolute: magnitude of the total {"\u00A0"}{"\u00A0"}|{"\u00A0"}{"\u00A0"} Relative: contribution to the total (%)</span>
            </CardDescription>
            <CardDescription className="text-base flex gap-2">
              <span>•</span>
              <span>
                Linear: proportional differences in magnitude {"\u00A0"}{"\u00A0"}|{"\u00A0"}{"\u00A0"} Logarithmic: scaled according to
                the logarithm of the magnitude.
              </span>
            </CardDescription>
          </div>
        </div>

        <FlowPanel
          arrowScaling={arrowScaling}
          setArrowScaling={setArrowScaling}
          range={timeRange}
          setRange={setTimeRange}
          rateRange={rateRange}
          setRateRange={setRateRange}
          selectedSpecies={selectedSpecies}
          setSelectedSpecies={setSelectedSpecies}
          valueDisplay={valueDisplay}
          setValueDisplay={setValueDisplay}
        />
        <div className="border rounded-lg p-2 xs:p-3 sm:p-4 bg-white h-[50rem]">
          <FlowGraph
            selectedSpecies={selectedSpecies}
            rateRange={{
              start: rateRange.start,
              end: rateRange.end,
              isLogScale: arrowScaling === 'logarithmic',
              maxArrowWidth: MAX_ARROW_WIDTH,
            }}
            timeRange={{
              start: timeRange.start,
              end: timeRange.end,
            }}
            valueDisplay={valueDisplay}
          />
        </div>
      </CardContent>
    </Card>
  )
}
