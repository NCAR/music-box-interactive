import { useSelector } from 'react-redux'
import { Download } from 'lucide-react'
import { downloadConfig } from '../services/config/downloadConfig'
import { downloadSimulationResults } from '../services/results/downloadResults'

// Sits beneath Run Simulation in the sidebar. Config is always downloadable, even empty --
// that doubles as a blank template. Results stays disabled until a simulation has run.
export function DownloadButtons({ className = '' }) {
  const mechanism = useSelector((state) => state.mechanism)
  const conditions = useSelector((state) => state.conditions)
  const simulation = useSelector((state) => state.simulation)

  const hasResults =
    simulation.status === 'succeeded' &&
    Array.isArray(simulation.results) &&
    simulation.results.length > 0

  const buttonClass =
    'flex items-center justify-center gap-1.5 flex-1 min-w-0 px-2 py-2 rounded-xl border border-border ' +
    'text-ink text-xs sm:text-sm font-medium hover:bg-surface-hover transition-colors duration-200 ' +
    'disabled:opacity-50 disabled:pointer-events-none disabled:hover:bg-transparent'

  return (
    <div className={`flex gap-1.5 ${className}`}>
      <button
        type="button"
        className={buttonClass}
        title="Download configuration"
        onClick={() => downloadConfig({ mechanism, conditions })}
      >
        <Download className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">Config</span>
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={!hasResults}
        title={hasResults ? 'Download results' : 'Run a simulation first'}
        onClick={() =>
          downloadSimulationResults({
            mechanism,
            results: simulation.results,
            excludedResults: simulation.excludedResults,
            metadata: simulation.metadata,
          })
        }
      >
        <Download className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">Results</span>
      </button>
    </div>
  )
}

export default DownloadButtons
