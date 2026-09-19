import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import ErrorBoundary from '../ErrorBoundary'
import IsoplethChart from '../IsoplethChart'
import { solvePersistentQuiet, resetPersistentSolver } from '../../services/simulation/localSolver'
import { getSpeciesDisplayName } from '../Plots/speciesFormat'
import { Mountain, XCircle } from 'lucide-react'

const DEFAULT_MIN_PERCENT = 10
const DEFAULT_MAX_PERCENT = 300
const DEFAULT_RESOLUTION = 12
const MIN_RESOLUTION = 3
const MAX_RESOLUTION = 24

// Even spacing in log space, so a 10%-300% scan samples the low end (where PO_x sensitivity
// typically changes fastest) as densely as the high end, matching the paper's own NOx scaling.
function logSpace(startFactor, endFactor, count) {
  if (count <= 1) return [startFactor]
  const logStart = Math.log(startFactor)
  const logEnd = Math.log(endFactor)
  return Array.from({ length: count }, (_, i) =>
    Math.exp(logStart + ((logEnd - logStart) * i) / (count - 1))
  )
}

// A small searchable chip multi-select, shared by the X-axis, Y-axis, and output species
// pickers below -- same interaction as ExploreChart's species picker, without its color legend.
function SpeciesPicker({ label, options, selected, onToggle, displayName = (name) => name }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return options
    return options.filter((option) => displayName(option).toLowerCase().includes(term))
  }, [options, search, displayName])

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-ink">{label}</span>
        <span className="text-[10px] text-muted">{selected.size} selected</span>
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search species"
        className="w-full h-7 px-2 mb-1.5 border border-border rounded text-xs focus:outline-none focus:ring-2 focus:ring-action"
      />
      <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
        {filtered.length === 0 && <span className="text-[10px] text-muted py-1">No species</span>}
        {filtered.map((option) => {
          const isOn = selected.has(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                isOn
                  ? 'bg-action text-white'
                  : 'bg-white text-muted border border-border hover:bg-surface-hover'
              }`}
            >
              {displayName(option)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function toggleInSet(setter, name) {
  setter((prev) => {
    const next = new Set(prev)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    return next
  })
}

/**
 * IsoplethsPage Component
 * Scans a 2-D grid of scaled concentrations for two user-chosen species groups (an X-axis group
 * and a Y-axis group), re-running the simulation at each grid point, and contours a user-chosen
 * output value (the summed final concentration of one or more species) across that grid --
 * the same idea as an ozone-isopleth diagram, generalized to whatever species the loaded
 * mechanism tracks instead of one fixed NOx/VOC/PO_x formula.
 */
export function IsoplethsPage() {
  const mechanismData = useSelector((state) => state.mechanism)
  const conditions = useSelector((state) => state.conditions)
  const simulation = useSelector((state) => state.simulation)

  const sourceMechanism = mechanismData.mechanism?.mechanism || {}
  const payloadSpeciesCount =
    mechanismData.species.length > 0
      ? mechanismData.species.length
      : Array.isArray(sourceMechanism.species)
        ? sourceMechanism.species.length
        : 0
  const payloadReactionCount =
    mechanismData.reactions.length > 0
      ? mechanismData.reactions.length
      : Array.isArray(sourceMechanism.reactions)
        ? sourceMechanism.reactions.length
        : 0
  const hasValidMechanism = payloadSpeciesCount > 0 && payloadReactionCount > 0

  // Axis pools: species with an explicit initial concentration, same source ExplorePage uses
  // for its sliders -- these are the only ones that can be scaled from a baseline value.
  const speciesNames = useMemo(
    () => Object.keys(conditions.initial.concentrations || {}).sort(),
    [conditions.initial.concentrations]
  )

  // Output pool: every species the last run actually produced, not just ones with an initial
  // concentration -- a product species is a valid thing to plot even though it isn't sliderable.
  // Result concentration keys are raw ("CONC.O3.mol m-3"); kept raw here so a chosen output
  // species can be read straight out of a grid cell's result with no name translation.
  const outputOptions = useMemo(() => {
    const firstPoint = Array.isArray(simulation.results) ? simulation.results[0] : null
    const keys =
      firstPoint?.concentrations && typeof firstPoint.concentrations === 'object'
        ? Object.keys(firstPoint.concentrations)
        : []
    return keys.sort()
  }, [simulation.results])

  const [xSpecies, setXSpecies] = useState(new Set())
  const [ySpecies, setYSpecies] = useState(new Set())
  const [outputSpecies, setOutputSpecies] = useState(new Set())
  const [minPercent, setMinPercent] = useState(DEFAULT_MIN_PERCENT)
  const [maxPercent, setMaxPercent] = useState(DEFAULT_MAX_PERCENT)
  const [resolution, setResolution] = useState(DEFAULT_RESOLUTION)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [grid, setGrid] = useState(null)
  const [runError, setRunError] = useState(null)
  const cancelRef = useRef(false)

  // A species picked for one axis disappears from the other's list, rather than merely
  // unselecting there silently -- scaling the same species on both axes at once would not mean
  // anything (whichever axis is applied second would just overwrite the first's factor).
  const xOptions = useMemo(() => speciesNames.filter((name) => !ySpecies.has(name)), [
    speciesNames,
    ySpecies,
  ])
  const yOptions = useMemo(() => speciesNames.filter((name) => !xSpecies.has(name)), [
    speciesNames,
    xSpecies,
  ])

  const toggleX = useCallback((name) => {
    toggleInSet(setXSpecies, name)
    setYSpecies((prev) => {
      if (!prev.has(name)) return prev
      const next = new Set(prev)
      next.delete(name)
      return next
    })
  }, [])
  const toggleY = useCallback((name) => {
    toggleInSet(setYSpecies, name)
    setXSpecies((prev) => {
      if (!prev.has(name)) return prev
      const next = new Set(prev)
      next.delete(name)
      return next
    })
  }, [])
  const toggleOutput = useCallback((name) => toggleInSet(setOutputSpecies, name), [])

  // Reset everything when a different example loads -- a previous scan's axes/results belong
  // to the old mechanism's species and are meaningless (and possibly nonexistent) in the new one.
  useEffect(() => {
    setXSpecies(new Set())
    setYSpecies(new Set())
    setOutputSpecies(new Set())
    setGrid(null)
    setRunError(null)
  }, [mechanismData.currentExample?.id])

  // The persistent solver is tied to the mechanism it was compiled from -- see ExplorePage's
  // identical lifecycle. Isopleths and Explore share the same module-level solver instance, so
  // whichever tab mounts most recently after a mechanism change gets a freshly compiled one.
  useEffect(() => {
    resetPersistentSolver()
  }, [mechanismData.mechanism])
  useEffect(() => () => resetPersistentSolver(), [])

  const canRun =
    hasValidMechanism && xSpecies.size > 0 && ySpecies.size > 0 && outputSpecies.size > 0 && !isRunning

  const runScan = useCallback(async () => {
    if (!canRun) return
    const xList = [...xSpecies]
    const yList = [...ySpecies]
    const outList = [...outputSpecies]
    const clampedResolution = Math.min(MAX_RESOLUTION, Math.max(MIN_RESOLUTION, resolution))
    const minFactor = Math.max(0.01, minPercent / 100)
    const maxFactor = Math.max(minFactor, maxPercent / 100)
    const factors = logSpace(minFactor, maxFactor, clampedResolution)

    const xBaseline = Object.fromEntries(
      xList.map((name) => [name, conditions.initial.concentrations[name] ?? 0])
    )
    const yBaseline = Object.fromEntries(
      yList.map((name) => [name, conditions.initial.concentrations[name] ?? 0])
    )

    cancelRef.current = false
    setIsRunning(true)
    setRunError(null)
    setProgress(0)

    const values = Array.from({ length: clampedResolution }, () =>
      new Array(clampedResolution).fill(null)
    )

    try {
      for (let row = 0; row < clampedResolution; row++) {
        for (let col = 0; col < clampedResolution; col++) {
          if (cancelRef.current) {
            setIsRunning(false)
            return
          }

          const scaledConcentrations = { ...conditions.initial.concentrations }
          xList.forEach((name) => {
            scaledConcentrations[name] = xBaseline[name] * factors[col]
          })
          yList.forEach((name) => {
            scaledConcentrations[name] = yBaseline[name] * factors[row]
          })

          const scanConditions = {
            ...conditions,
            initial: { ...conditions.initial, concentrations: scaledConcentrations },
          }

          // Sequential by necessity: the solver is a single reused instance, not parallelizable.
          const { filteredResults } = await solvePersistentQuiet({
            mechanismData,
            conditions: scanConditions,
          })
          const last = filteredResults[filteredResults.length - 1]
          const total = outList.reduce((sum, key) => sum + (last?.concentrations?.[key] ?? 0), 0)
          values[row][col] = total
          setProgress((prev) => prev + 1)
        }
      }

      if (!cancelRef.current) {
        setGrid({
          resolution: clampedResolution,
          xLabel: xList.map(getSpeciesDisplayName).join(' + '),
          yLabel: yList.map(getSpeciesDisplayName).join(' + '),
          outputLabel: outList.map(getSpeciesDisplayName).join(' + '),
          xFactors: factors,
          yFactors: factors,
          values,
        })
      }
    } catch (error) {
      setRunError(error?.message || 'Grid scan failed')
    } finally {
      setIsRunning(false)
    }
  }, [canRun, xSpecies, ySpecies, outputSpecies, minPercent, maxPercent, resolution, conditions, mechanismData])

  const cancelScan = useCallback(() => {
    cancelRef.current = true
  }, [])

  if (!hasValidMechanism) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Isopleths</CardTitle>
          <CardDescription>Scan two precursor groups and contour the result</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted">
            <div className="flex justify-center mb-4">
              <Mountain className="w-16 h-16" />
            </div>
            <p className="text-sm max-w-md mx-auto">
              Load an example or build a mechanism first, then come back here to scan it across a
              grid of scaled concentrations.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const total = grid ? grid.resolution * grid.resolution : resolution * resolution

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-heading">Isopleths</h1>
          <p className="text-sm text-muted">
            Pick two species groups and an output, then contour how the output responds across a
            grid of scaled concentrations.
          </p>
        </div>
        {mechanismData.selectedMechanism && (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-heading bg-surface-alt border border-border rounded-full px-3 py-1.5">
            {mechanismData.selectedMechanism.toUpperCase()} mechanism
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mountain className="w-4 h-4" />
              Configure Scan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SpeciesPicker
              label="X axis species"
              options={xOptions}
              selected={xSpecies}
              onToggle={toggleX}
            />
            <SpeciesPicker
              label="Y axis species"
              options={yOptions}
              selected={ySpecies}
              onToggle={toggleY}
            />
            <SpeciesPicker
              label="Output (summed)"
              options={outputOptions}
              selected={outputSpecies}
              onToggle={toggleOutput}
              displayName={getSpeciesDisplayName}
            />

            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="block">
                <span className="text-[10px] text-muted">Min % of baseline</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={minPercent}
                  onChange={(e) => setMinPercent(parseFloat(e.target.value) || DEFAULT_MIN_PERCENT)}
                  className="w-full h-7 px-2 border border-border rounded text-xs font-mono focus:outline-none focus:ring-2 focus:ring-action"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-muted">Max % of baseline</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={maxPercent}
                  onChange={(e) => setMaxPercent(parseFloat(e.target.value) || DEFAULT_MAX_PERCENT)}
                  className="w-full h-7 px-2 border border-border rounded text-xs font-mono focus:outline-none focus:ring-2 focus:ring-action"
                />
              </label>
            </div>
            <label className="block mb-3">
              <span className="text-[10px] text-muted">
                Grid resolution ({MIN_RESOLUTION}-{MAX_RESOLUTION} per axis)
              </span>
              <input
                type="number"
                min={MIN_RESOLUTION}
                max={MAX_RESOLUTION}
                value={resolution}
                onChange={(e) =>
                  setResolution(parseInt(e.target.value, 10) || DEFAULT_RESOLUTION)
                }
                className="w-full h-7 px-2 border border-border rounded text-xs font-mono focus:outline-none focus:ring-2 focus:ring-action"
              />
              <span className="text-[10px] text-muted">
                {Math.min(MAX_RESOLUTION, Math.max(MIN_RESOLUTION, resolution)) ** 2} simulation
                runs, roughly {Math.round((Math.min(MAX_RESOLUTION, Math.max(MIN_RESOLUTION, resolution)) ** 2 * 150) / 1000)}s
              </span>
            </label>

            {isRunning ? (
              <div className="space-y-1.5">
                <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                  <div
                    className="h-full bg-action transition-all"
                    style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted">
                    Running {progress} / {total}
                  </span>
                  <button
                    type="button"
                    onClick={cancelScan}
                    className="flex items-center gap-1 text-[10px] font-semibold text-danger hover:underline"
                  >
                    <XCircle className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Button
                variant="primary"
                className="w-full"
                disabled={!canRun}
                onClick={runScan}
              >
                Compute Isopleth
              </Button>
            )}

            {runError && <p className="text-xs text-danger mt-2">{runError}</p>}
          </CardContent>
        </Card>

        <ErrorBoundary>
          <IsoplethChart grid={grid} isRunning={isRunning} />
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default IsoplethsPage
