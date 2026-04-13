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

  const duration = useSelector((state) => state.conditions.basic.duration);
  const timeStep = useSelector((state) => state.conditions.basic.timeStep);
  const [timeRange, setTimeRange] = useState({ start: 0, end: duration });
  const timeValues = Array.from({ length: ((duration || 2e5) - 0) / (timeStep || 1) + 1 }, (_, i) => 0 + i * (timeStep || 1));

  // const example = useSelector((state) => state);
  // console.log('FlowPanel example state:', example);

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
          timeValues={timeValue}
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
          timeRange={{
              start: timeRange.start,
              end:   timeRange.end,
          }}
        />
      </div>
    </div>
  )
}
