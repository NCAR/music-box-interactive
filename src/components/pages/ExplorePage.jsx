import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import ErrorBoundary from '../ErrorBoundary'
import ExploreChart from '../ExploreChart'
import {
  setTemperatureEverywhere,
  setPressureEverywhere,
  setConcentration,
  setRateConstant,
} from '../../redux/slices/conditionsSlice'
import { setError, setStatus } from '../../redux/slices/simulationSlice'
import { runPersistentSimulation, resetPersistentSolver } from '../../services/simulation/localSolver'
import { useClickOutside } from '../../hooks/useClickOutside'
import { SlidersHorizontal, ChevronDown, Check, X, Compass } from 'lucide-react'

const DEFAULT_SPECIES_SLIDER_COUNT = 2
// A slider whose default value is exactly zero gets this as its default max instead of 0 * 1.5.
const FALLBACK_MAX_FOR_ZERO = 1e-10

const ENV_PARAMS = [
  { id: 'env:temperature', group: 'Environment', label: 'Temperature', unit: 'K' },
  { id: 'env:pressure', group: 'Environment', label: 'Pressure', unit: 'Pa' },
]

// Default slider bounds: 0 up to 50% above the value the slider had when it was added.
function defaultRangeFor(value) {
  const max = value > 0 ? value * 1.5 : FALLBACK_MAX_FOR_ZERO
  return { min: 0, max }
}

// A native range input with max <= min collapses to a single fixed position and cannot be
// dragged. When editing one bound would cross the other, widen the untouched bound by 10%
// instead of snapping it flush -- that keeps the range draggable and keeps the edited bound at
// exactly the value the user typed.
function nudgeAbove(x) {
  return x + (Math.abs(x) || FALLBACK_MAX_FOR_ZERO) * 0.1
}
function nudgeBelow(x) {
  return x - (Math.abs(x) || FALLBACK_MAX_FOR_ZERO) * 0.1
}

// Standard scientific notation re-normalizes each number to its own exponent, so a value 10%
// below a power of ten (9e-19 vs 1e-18) reads as a different order of magnitude even though it
// barely moved. exponentOf reads that exponent off toExponential() rather than log10, which is
// unreliable right at a power-of-ten boundary.
function exponentOf(x) {
  return parseInt(x.toExponential().split('e')[1], 10)
}

// Format a bound against the larger-magnitude bound's exponent, so two close bounds display
// under one shared power of ten (e.g. 0.900e-18 next to 1.000e-18) instead of jumping exponents.
function formatBound(value, referenceMagnitude) {
  if (value === 0) return '0'
  if (referenceMagnitude === 0) return value.toExponential(3)
  const exponent = exponentOf(referenceMagnitude)
  return `${(value / 10 ** exponent).toFixed(3)}e${exponent}`
}

function formatValue(value, unit) {
  if (unit === 'K') return `${value.toFixed(1)} K`
  if (unit === 'Pa') return `${Math.round(value)} Pa`
  if (unit === 'rate') return value.toExponential(2)
  return `${value.toExponential(2)} mol/m³`
}

// A Min/Max bound field. Its displayed text is local draft state, not a direct reflection of
// the numeric range prop -- typing something like "1e-8" passes through invalid intermediate
// states ("1e", "1e-") that don't parse to a number yet. A plain controlled input bound to the
// numeric value would refuse to show those keystrokes (the prop wouldn't have changed, so React
// re-renders the old text right back), making scientific notation impossible to type. This only
// commits upward (onCommit) once the text parses to a finite number; the field keeps showing
// whatever was actually typed regardless -- initialText only seeds the very first render (or a
// remount forced by a `key` change), it is never re-applied over live typing.
function BoundField({ label, initialText, onCommit }) {
  const [text, setText] = useState(initialText)

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const nextText = e.target.value
        setText(nextText)
        const parsed = parseFloat(nextText)
        if (Number.isFinite(parsed)) onCommit(parsed)
      }}
      aria-label={label}
      className="w-16 text-[10px] font-mono border border-border rounded px-1 py-0.5 text-ink focus:outline-none focus:ring-2 focus:ring-action"
    />
  )
}

function SliderRow({
  label,
  valueLabel,
  value,
  range,
  step,
  minKey,
  maxKey,
  onValueChange,
  onRangeChange,
  onRemove,
}) {
  const referenceMagnitude = Math.max(Math.abs(range.min), Math.abs(range.max))
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-sm font-semibold text-ink truncate">{label}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-xs font-mono text-action font-bold">{valueLabel}</span>
          <button
            type="button"
            onClick={onRemove}
            title={`Remove ${label} slider`}
            className="text-muted hover:text-danger rounded p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={step}
        value={value}
        onChange={(e) => onValueChange(parseFloat(e.target.value))}
        className="w-full accent-action"
      />
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-[10px] text-muted flex-shrink-0">Min</span>
        <BoundField
          key={`min-${minKey}`}
          label={`${label} minimum`}
          initialText={formatBound(range.min, referenceMagnitude)}
          onCommit={(min) => {
            const crossesMax = min >= range.max
            onRangeChange({
              min,
              max: crossesMax ? nudgeAbove(min) : range.max,
              nudged: crossesMax ? 'max' : null,
            })
          }}
        />
        <span className="text-[10px] text-muted flex-shrink-0 ml-auto">Max</span>
        <BoundField
          key={`max-${maxKey}`}
          label={`${label} maximum`}
          initialText={formatBound(range.max, referenceMagnitude)}
          onCommit={(max) => {
            const crossesMin = max <= range.min
            onRangeChange({
              min: crossesMin ? nudgeBelow(max) : range.min,
              max,
              nudged: crossesMin ? 'min' : null,
            })
          }}
        />
      </div>
    </div>
  )
}

/**
 * ExplorePage Component
 * Sliders for temperature, pressure, and initial concentrations that auto-rerun the local
 * simulation and update the results chart live, instead of the edit -> Run Simulation -> Results
 * round trip the rest of the app uses.
 */
export function ExplorePage() {
  const dispatch = useDispatch()
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

  // Only species with an explicit initial concentration are meaningful "initial condition"
  // sliders -- a product-only species that starts at 0 is an output, not an input to tweak.
  const speciesNames = useMemo(
    () => Object.keys(conditions.initial.concentrations || {}).sort(),
    [conditions.initial.concentrations]
  )

  // Rate parameters (PHOTO.*, USER.*, EMIS.*, ...) hydrated from a mechanism's own conditions
  // data -- a static per-run value, unlike Chapman-style time-varying photolysis, which lives in
  // conditions.evolving instead and isn't a single value a slider could represent.
  const rateParamNames = useMemo(
    () => Object.keys(conditions.rateConstants || {}).sort(),
    [conditions.rateConstants]
  )

  const paramDefs = useMemo(
    () => [
      ...ENV_PARAMS,
      ...speciesNames.map((name) => ({
        id: `species:${name}`,
        group: 'Species (initial conc.)',
        label: name,
        unit: 'conc',
      })),
      ...rateParamNames.map((name) => ({
        id: `rate:${name}`,
        group: 'Rate Parameters',
        label: name,
        unit: 'rate',
      })),
    ],
    [speciesNames, rateParamNames]
  )

  const getValueFor = useCallback(
    (id) => {
      if (id === 'env:temperature') return conditions.initial.temperature
      if (id === 'env:pressure') return conditions.initial.pressure
      if (id.startsWith('rate:')) return conditions.rateConstants[id.slice('rate:'.length)] ?? 0
      return conditions.initial.concentrations[id.slice('species:'.length)] ?? 0
    },
    [conditions.initial, conditions.rateConstants]
  )

  const [enabledIds, setEnabledIds] = useState(null)
  const [ranges, setRanges] = useState({})
  // Bumped for a bound whenever it gets auto-nudged by editing its sibling, forcing that
  // BoundField to remount so its displayed text picks up the new value. BoundField otherwise
  // never re-reads its value prop once mounted (see its own comment above).
  const [boundKeys, setBoundKeys] = useState({})
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const pickerRef = useRef(null)
  useClickOutside(pickerRef, useCallback(() => setPickerOpen(false), []), pickerOpen)

  // Reset slider selection and ranges when a different example loads.
  useEffect(() => {
    setEnabledIds(null)
    setRanges({})
    setBoundKeys({})
  }, [mechanismData.currentExample?.id])

  useEffect(() => {
    if (enabledIds === null) {
      setEnabledIds(
        new Set([
          'env:temperature',
          'env:pressure',
          ...speciesNames.slice(0, DEFAULT_SPECIES_SLIDER_COUNT).map((name) => `species:${name}`),
        ])
      )
    }
  }, [enabledIds, speciesNames])

  // Seed a default range (0 to 1.5x the value it had when added) the first time each slider
  // becomes enabled. Left alone afterward so a user's own min/max edits stick.
  useEffect(() => {
    if (!enabledIds) return
    setRanges((prev) => {
      let changed = false
      const next = { ...prev }
      enabledIds.forEach((id) => {
        if (next[id]) return
        next[id] = defaultRangeFor(getValueFor(id))
        changed = true
      })
      return changed ? next : prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledIds])

  const toggleEnabled = (id) => {
    setEnabledIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ---- Non-overlapping auto-run ----
  const [isSolving, setIsSolving] = useState(false)
  const runningRef = useRef(false)
  const pendingRef = useRef(false)
  const latestArgsRef = useRef({ mechanismData, conditions })
  latestArgsRef.current = { mechanismData, conditions }
  const hasValidMechanismRef = useRef(hasValidMechanism)
  hasValidMechanismRef.current = hasValidMechanism

  const triggerRun = useCallback(() => {
    if (!hasValidMechanismRef.current) return
    if (runningRef.current) {
      pendingRef.current = true
      return
    }
    runningRef.current = true
    setIsSolving(true)
    dispatch(setStatus('running'))
    runPersistentSimulation(latestArgsRef.current)
      .catch((error) => {
        dispatch(setError({ message: error?.message || 'Failed to run simulation' }))
        dispatch(setStatus('failed'))
      })
      .finally(() => {
        runningRef.current = false
        setIsSolving(false)
        if (pendingRef.current) {
          pendingRef.current = false
          triggerRun()
        }
      })
  }, [dispatch])

  // Every slider fires this directly. triggerRun's own runningRef/pendingRef guard already
  // coalesces overlapping calls (fire immediately; if a solve is already in flight, remember to
  // run again with the latest value once it finishes), which keeps up fine now that a reused
  // solver takes ~150ms instead of rebuilding from scratch. A debounce here would only add
  // latency while dragging for no benefit.
  const scheduleRun = triggerRun

  const updateValueFor = useCallback(
    (id, v) => {
      if (id === 'env:temperature') dispatch(setTemperatureEverywhere(v))
      else if (id === 'env:pressure') dispatch(setPressureEverywhere(v))
      else if (id.startsWith('rate:')) {
        dispatch(setRateConstant({ name: id.slice('rate:'.length), value: v }))
      } else dispatch(setConcentration({ species: id.slice('species:'.length), value: v }))
      scheduleRun()
    },
    [dispatch, scheduleRun]
  )

  // Auto-run once whenever a (new) mechanism is loaded, so Explore shows a live chart
  // immediately rather than waiting for the first slider drag. The persistent solver is tied
  // to the mechanism it was compiled from, so it must be torn down first -- reusing it across
  // a mechanism change would keep solving the *previous* mechanism.
  useEffect(() => {
    resetPersistentSolver()
    if (hasValidMechanism) triggerRun()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mechanismData.mechanism])

  // Free the persistent solver when leaving Explore entirely, so its compiled WASM solver
  // doesn't stay resident once the user has moved on.
  useEffect(() => () => resetPersistentSolver(), [])

  const filteredPickerDefs = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase()
    if (!term) return paramDefs
    return paramDefs.filter((def) => def.label.toLowerCase().includes(term))
  }, [paramDefs, pickerSearch])

  const pickerGroups = useMemo(() => {
    const groups = new Map()
    filteredPickerDefs.forEach((def) => {
      if (!groups.has(def.group)) groups.set(def.group, [])
      groups.get(def.group).push(def)
    })
    return [...groups.entries()]
  }, [filteredPickerDefs])

  if (!hasValidMechanism) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Explore</CardTitle>
          <CardDescription>Drag a slider, watch the chemistry respond</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted">
            <div className="flex justify-center mb-4">
              <Compass className="w-16 h-16" />
            </div>
            <p className="text-sm max-w-md mx-auto">
              Load an example or build a mechanism first, then come back here to explore it with
              sliders.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const enabledDefs = paramDefs.filter((def) => enabledIds?.has(def.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-heading">Explore</h1>
          <p className="text-sm text-muted">
            Drag a slider, watch the chemistry respond &mdash; no run button required.
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
              <SlidersHorizontal className="w-4 h-4" />
              Adjust &amp; Explore
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enabledDefs.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">No sliders yet -- add one below.</p>
            ) : (
              enabledDefs.map((def) => {
                const value = getValueFor(def.id)
                const range = ranges[def.id] ?? defaultRangeFor(value)
                const keys = boundKeys[def.id] ?? { min: 0, max: 0 }
                const step = Math.abs(range.max - range.min) / 1000 || 1e-15

                const handleRangeChange = ({ nudged, ...next }) => {
                  setRanges((prev) => ({ ...prev, [def.id]: next }))
                  if (nudged) {
                    setBoundKeys((prev) => {
                      const cur = prev[def.id] ?? { min: 0, max: 0 }
                      return { ...prev, [def.id]: { ...cur, [nudged]: cur[nudged] + 1 } }
                    })
                  }
                  // Keep the value draggable within its new bounds -- otherwise a narrowed
                  // range leaves the slider's actual value stranded outside [min, max], and
                  // the native range input can no longer be dragged back into range.
                  const clamped = Math.min(Math.max(value, next.min), next.max)
                  if (clamped !== value) updateValueFor(def.id, clamped)
                }

                return (
                  <SliderRow
                    key={def.id}
                    label={def.label}
                    valueLabel={formatValue(value, def.unit)}
                    value={value}
                    range={range}
                    step={step}
                    minKey={keys.min}
                    maxKey={keys.max}
                    onValueChange={(v) => updateValueFor(def.id, v)}
                    onRangeChange={handleRangeChange}
                    onRemove={() => toggleEnabled(def.id)}
                  />
                )
              })
            )}

            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => setPickerOpen((open) => !open)}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-action bg-surface-alt border border-dashed border-border rounded-lg px-3 py-2 hover:bg-surface-hover"
              >
                + Add slider
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {pickerOpen && (
                <div
                  ref={pickerRef}
                  className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-border rounded-lg shadow-lg py-1"
                >
                  <div className="px-2 pb-2">
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Search"
                      className="w-full h-8 px-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-action"
                    />
                  </div>
                  {pickerGroups.map(([group, defs]) => (
                    <div key={group}>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted px-3 py-1">
                        {group}
                      </div>
                      {defs.map((def) => {
                        const isOn = enabledIds?.has(def.id)
                        return (
                          <button
                            key={def.id}
                            type="button"
                            onClick={() => toggleEnabled(def.id)}
                            className="w-full flex items-center gap-2 text-left text-sm px-3 py-1.5 text-ink hover:bg-surface-hover"
                          >
                            <Check
                              className={`w-3.5 h-3.5 flex-shrink-0 ${isOn ? 'opacity-100 text-action' : 'opacity-0'}`}
                            />
                            <span className="flex-1 truncate">{def.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link
              to="/conditions"
              className="block text-center text-xs font-semibold text-action border border-dashed border-border rounded-lg px-3 py-2 mt-2 hover:bg-surface-alt"
            >
              Fine-tune exact values in Conditions &rarr;
            </Link>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-action uppercase tracking-wide">
            <span
              className={`w-2 h-2 rounded-full bg-action ${isSolving ? 'animate-pulse' : ''}`}
            />
            {isSolving ? 'Recalculating…' : 'Live'}
          </div>
          <ErrorBoundary>
            <ExploreChart results={simulation.results} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}

export default ExplorePage
