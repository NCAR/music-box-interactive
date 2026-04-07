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
  const [arrowScaling, setArrowScaling] = useState('linear');
  const [arrowWidth, setArrowWidth]     = useState(1);

  const timeValues = Array.from({ length: 1000 }, (_, i) => i * 259);
  const [timeRange, setTimeRange] = useState({ minIndex: 0, maxIndex: timeValues.length - 1 });

  const FLUX_MIN = 0.00004155230486602744;
  const FLUX_MAX = 0.9648828478468641;
  const fluxValues = Array.from({ length: 1000 }, (_, i) =>
      FLUX_MIN + (i / 999) * (FLUX_MAX - FLUX_MIN)
  );
  const [fluxRange, setFluxRange] = useState({ minIndex: 0, maxIndex: fluxValues.length - 1 });

  const [selectedSpecies, setSelectedSpecies] = useState([]);

  // If no simulation results, show placeholder
  const simulation = useSelector((state) => state.simulation);
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
    <div className="flex h-full min-h-screen w-full gap-4">
      <div className="w-[30%] h-full">
        <FlowPanel
          arrowScaling={arrowScaling}
          setArrowScaling={setArrowScaling}
          arrowWidth={arrowWidth}
          setArrowWidth={setArrowWidth}
          timeValues={timeValues}
          range={timeRange}
          setRange={setTimeRange}
          fluxValues={fluxValues}
          fluxRange={fluxRange}
          setFluxRange={setFluxRange}
          selectedSpecies={selectedSpecies}
          setSelectedSpecies={setSelectedSpecies}
        />
      </div>
      <div className="w-[70%] h-[50%] bg-white">
        <FlowGraph
          selectedSpecies={selectedSpecies}
          fluxRange={{
              start:        fluxValues[fluxRange.minIndex],
              end:          fluxValues[fluxRange.maxIndex],
              isLogScale:   arrowScaling === 'logarithmic',
              maxArrowWidth: Number(arrowWidth),
          }}
          // Pass actual time values (not indices) so FlowGraph can filter results rows
          timeRange={{
              start: timeValues[timeRange.minIndex],
              end:   timeValues[timeRange.maxIndex],
          }}
        />
      </div>
    </div>
  )
}
