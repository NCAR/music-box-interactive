import { React, useState } from 'react'
import { FlowGraph } from './FlowGraph'
import { FlowPanel } from './FlowPanel'
import { useSelector } from 'react-redux'
import { Card, CardContent } from '../ui/card'
import { Waypoints } from 'lucide-react'

/*
 * FlowDiagram Component
 * Visualizes the flow of chemical species and reactions in a diagram format.
 * Owns all shared state and passes it down to FlowPanel (controls) and FlowGraph (rendering).
 */

export function FlowDiagram() {
  const [arrowScaling, setArrowScaling] = useState('logarithmic')
  const [layoutMode, setLayoutMode] = useState('force')

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
        <FlowPanel
          arrowScaling={arrowScaling}
          setArrowScaling={setArrowScaling}
          range={timeRange}
          setRange={setTimeRange}
          fluxRange={fluxRange}
          setFluxRange={setFluxRange}
          selectedSpecies={selectedSpecies}
          setSelectedSpecies={setSelectedSpecies}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
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
            layoutMode={layoutMode}
          />
        </div>
      </CardContent>
    </Card>
  )
}
