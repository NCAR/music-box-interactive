import { React, useState, useEffect } from 'react'
import { FlowGraph } from './FlowGraph'
import { isRealSpecies, computeGrossProduction } from './flowUtils'
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

  // Fixed spread between the thinnest and thickest flux edges (BASE=2px up to MAX_ARROW_WIDTH+2px)
  const MAX_ARROW_WIDTH = 4

  const duration = useSelector((state) => state.conditions.basic.duration)
  const [timeRange, setTimeRange] = useState({ start: 0, end: duration })

  // const example = useSelector((state) => state);
  // console.log('FlowPanel example state:', example);

  const FLUX_MIN = 0.00004155230486602744
  const FLUX_MAX = 0.9648828478468641
  const [fluxRange, setFluxRange] = useState({ start: FLUX_MIN, end: FLUX_MAX })

  const [selectedSpecies, setSelectedSpecies] = useState([])

  // If no simulation results, show placeholder
  const simulation = useSelector((state) => state.simulation)
  const reactions = useSelector((state) => state.mechanism.reactions)

  // The gross production is cumulative over the selected time window, so its magnitude 
  // changes with the time range and species selection. The range must therefore be
  // recalculated whenever either changes to avoid stale scaling that can mute edges.
  useEffect(() => {
    if (!reactions || reactions.length === 0) return
    if (!selectedSpecies || selectedSpecies.length === 0) return

    const visibleReactions = reactions.filter((rxn) => {
      const realReactants = rxn.reactants
        ? rxn.reactants.map((r) => r['species name']).filter(isRealSpecies)
        : []
      return realReactants.length > 0 && realReactants.every((sp) => selectedSpecies.includes(sp))
    })

    if (visibleReactions.length === 0) return

    const timeStart = timeRange.start ?? 0
    const timeEnd = timeRange.end ?? Infinity

    const fluxValues = visibleReactions.map((rxn) =>
      computeGrossProduction(rxn, simulation.excludedResults, timeStart, timeEnd)
    )

    const min = Math.min(...fluxValues)
    const max = Math.max(...fluxValues)

    if (isFinite(min) && isFinite(max)) {
      setFluxRange({ start: min, end: max })
    }
  }, [reactions, simulation.excludedResults, selectedSpecies, timeRange.start, timeRange.end])
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
          <CardDescription className="text-base">
            <span className="font-semibold">Note:</span> This diagram shows cumulative
            production, representing the time-integrated chemical production of the
            species without accounting for subsequent chemical loss.
          </CardDescription>
        </div>

        <FlowPanel
          arrowScaling={arrowScaling}
          setArrowScaling={setArrowScaling}
          range={timeRange}
          setRange={setTimeRange}
          fluxRange={fluxRange}
          setFluxRange={setFluxRange}
          selectedSpecies={selectedSpecies}
          setSelectedSpecies={setSelectedSpecies}
          valueDisplay={valueDisplay}
          setValueDisplay={setValueDisplay}
        />
        <div className="border rounded-lg p-2 xs:p-3 sm:p-4 bg-white min-h-[32rem]">
          <FlowGraph
            selectedSpecies={selectedSpecies}
            fluxRange={{
              start: fluxRange.start,
              end: fluxRange.end,
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
