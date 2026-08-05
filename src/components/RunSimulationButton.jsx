import useRunSimulation from '../hooks/useRunSimulation'
import { Button } from './ui/button'
import { Loader2, Play } from 'lucide-react'

/**
 * RunSimulationButton Component
 * Compact button to run simulations from any page
 */
export function RunSimulationButton({ className = '' }) {
  const { runSimulation, isRunning, isDisabled, tooltip } = useRunSimulation()

  return (
    <Button
      onClick={runSimulation}
      disabled={isDisabled}
      variant="default"
      size="lg"
      className={`mt-2 mb-2 ${className}`}
      title={tooltip}
    >
      {isRunning ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Running...
        </>
      ) : (
        <>
          <Play className="w-4 h-4 mr-2" />
          Run Simulation
        </>
      )}
    </Button>
  )
}

export default RunSimulationButton
