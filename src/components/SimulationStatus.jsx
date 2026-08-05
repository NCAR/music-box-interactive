import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useNavigate } from 'react-router-dom'
import {
  Pause,
  AlertCircle,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  Play,
  BarChart3,
  Lightbulb,
} from 'lucide-react'

/**
 * SimulationStatus Component
 * Displays simulation status with polling support for long-running simulations
 */
export function SimulationStatus() {
  const navigate = useNavigate()
  const simulation = useSelector((state) => state.simulation)
  const mechanism = useSelector((state) => state.mechanism.selectedMechanism)
  const currentExample = useSelector((state) => state.mechanism.currentExample)
  const conditions = useSelector((state) => state.conditions)

  const renderCount = useRef(0)
  const pollingIntervalRef = useRef(null)

  useEffect(() => {
    renderCount.current++
  })

  // Cleanup polling on unmount
  useEffect(() => {
    const interval = pollingIntervalRef.current
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [])

  const getStatusDisplay = () => {
    switch (simulation.status) {
      case 'idle': {
        const hasExample = currentExample && currentExample.id
        return {
          color: hasExample ? 'green' : 'orange',
          Icon: hasExample ? Pause : AlertCircle,
          title: hasExample ? 'Ready to Run' : 'Please choose examples to start your simulation',
          message: hasExample
            ? 'Click the Run button to start your simulation'
            : 'Select an example from the Dashboard to begin',
        }
      }
      case 'running':
        return {
          color: 'blue',
          Icon: Zap,
          title: 'Running Simulation',
          message: 'Your simulation is currently running...',
        }
      case 'succeeded':
        return {
          color: 'green',
          Icon: CheckCircle2,
          title: 'Simulation Complete!',
          message: 'Your simulation finished successfully',
        }
      case 'failed':
        return {
          color: 'red',
          Icon: XCircle,
          title: 'Simulation Failed',
          message: simulation.error?.message || 'An error occurred',
        }
      default:
        return {
          color: 'gray',
          Icon: HelpCircle,
          title: 'Unknown Status',
          message: 'Unexpected simulation state',
        }
    }
  }

  const status = getStatusDisplay()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Simulation Status</CardTitle>
            <CardDescription className="text-muted italic">
              Monitor your simulation execution
            </CardDescription>
          </div>

          {/* <Button
            onClick={handleRunSimulation}
            disabled={simulation.status === 'running' || !mechanism || !currentExample || isSubmitting}
            variant="action"
            size="default"
            className="rounded-2xl"
            title={!mechanism || !currentExample ? 'Please select an example to run simulation' : ''}
          >
            {simulation.status === 'running' ? (
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
          </Button> */}
        </div>
      </CardHeader>

      <CardContent>
        <div
          className={`p-6 rounded-lg border-2 bg-surface-alt ${
            status.color === 'green'
              ? 'border-green-300'
              : status.color === 'blue'
                ? 'border-blue-300'
                : status.color === 'red'
                  ? 'border-red-300'
                  : status.color === 'orange'
                    ? 'border-orange-300'
                    : 'border-border'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <status.Icon
              className={`w-10 h-10 ${
                status.color === 'green'
                  ? 'text-green-600'
                  : status.color === 'blue'
                    ? 'text-blue-600'
                    : status.color === 'red'
                      ? 'text-red-600'
                      : status.color === 'orange'
                        ? 'text-orange-600'
                        : 'text-muted'
              }`}
            />
            <div>
              <h3 className="font-semibold text-lg text-ink">{status.title}</h3>
              <p className="text-sm text-muted">{status.message}</p>
            </div>
          </div>

          {simulation.status === 'running' && (
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-sm text-muted">
                  Processing... (render #{renderCount.current})
                </span>
              </div>
            </div>
          )}

          {simulation.status === 'succeeded' && simulation.metadata && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted">
                <strong className="text-ink font-semibold">Mechanism:</strong>{' '}
                {simulation.metadata.mechanism?.toUpperCase()}
              </p>
              <p className="text-sm text-muted">
                <strong className="text-ink font-semibold">Duration:</strong>{' '}
                {simulation.metadata.duration}s
              </p>
              <p className="text-sm text-muted">
                <strong className="text-ink font-semibold">Output Points:</strong>{' '}
                {simulation.metadata.outputPoints}
              </p>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="glass"
                  size="default"
                  onClick={() => navigate('/plots')}
                  className="rounded-2xl"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Results
                </Button>
              </div>
            </div>
          )}

          {simulation.status === 'failed' && simulation.error && (
            <div className="mt-4 p-3 bg-caution border border-red-200 rounded text-sm">
              <strong className="text-danger">Error Details:</strong>
              <pre className="mt-2 text-xs overflow-auto text-ink">
                {JSON.stringify(simulation.error, null, 2)}
              </pre>
            </div>
          )}

          {/* Show loaded example info when in idle state */}
          {simulation.status === 'idle' && currentExample && currentExample.id && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted">
                <strong className="text-ink font-semibold">Example:</strong> {currentExample.name}
              </p>
              {currentExample.description && (
                <p className="text-xs text-muted italic">{currentExample.description}</p>
              )}
              <p className="text-sm text-muted">
                <strong className="text-ink font-semibold">Mechanism:</strong>{' '}
                {mechanism?.toUpperCase()}
              </p>
              <p className="text-sm text-muted">
                <strong className="text-ink font-semibold">Duration:</strong>{' '}
                {conditions.basic.duration}s
              </p>
              <p className="text-sm text-muted">
                <strong className="text-ink font-semibold">Temperature:</strong>{' '}
                {conditions.initial.temperature}K
              </p>
              <p className="text-sm text-muted">
                <strong className="text-ink font-semibold">Pressure:</strong>{' '}
                {conditions.initial.pressure}Pa
              </p>
              <p className="text-sm text-muted">
                <strong className="text-ink font-semibold">Species:</strong>{' '}
                {Object.keys(conditions.initial.concentrations || {}).length}
              </p>
              {conditions.rateConstants && Object.keys(conditions.rateConstants).length > 0 && (
                <p className="text-sm text-muted">
                  <strong className="text-ink font-semibold">Rate Constants:</strong>{' '}
                  {Object.keys(conditions.rateConstants).length}
                </p>
              )}
            </div>
          )}
        </div>

        {simulation.status === 'idle' && !currentExample && (
          <div className="mt-4 bg-surface-alt border border-border rounded-lg p-3 text-xs text-muted">
            <p className="font-semibold mb-1 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Before running:
            </p>
            <ul className="space-y-0.5 ml-4">
              <li>• Select an example from the Dashboard</li>
              <li>• Or configure your own mechanism in the Mechanism tab</li>
              <li>• Set initial conditions in the Conditions tab</li>
              <li>• Adjust simulation duration and timestep as needed</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SimulationStatus
