import { MusicBox } from '@ncar/music-box'
import { buildTracedSimulationPayload } from './tracedPayload'
import { filterProductConcentrations } from './filterProductConcentrations'
import { normalizeSimulationResults } from './results'
import { store } from '../../../redux/store'
import {
  setExcludedResults,
  setMetadata,
  setResults,
  setStatus,
} from '../../../redux/slices/simulationSlice'

// A single reused MusicBox instance, for callers (the Explore tab) that re-run the *same*
// mechanism repeatedly with only its conditions changing. Compiling a mechanism into a solver
// is the expensive part of a solve; reusing one across calls skips that on every call after the
// first. Module-level rather than per-component state because only one simulation runs at a
// time regardless of which component triggered it.
let cachedBox = null

/**
 * Frees the persistent solver, if any. Call this when the mechanism itself changes (a
 * different example loaded, species/reactions edited) or when the caller is done reusing it
 * (e.g. navigating away from Explore) -- the next runPersistentSimulation() call will compile
 * a fresh one.
 */
export const resetPersistentSolver = () => {
  cachedBox?.dispose()
  cachedBox = null
}

/**
 * Like runLocalSimulation, but keeps the compiled solver alive across calls instead of
 * rebuilding it every time. Only correct to call repeatedly for the *same* mechanism -- the
 * caller is responsible for calling resetPersistentSolver() first when the mechanism changes,
 * since this function has no way to detect that on its own (a plain object identity check
 * would break under Redux's own re-render/reconciliation).
 */
export const runPersistentSimulation = async ({ mechanismData, conditions }) => {
  const { payload, mechanismLabel, productConcentrationKeys } = buildTracedSimulationPayload({
    mechanismData,
    conditions,
  })

  if (!cachedBox) {
    cachedBox = MusicBox.fromJson(payload, { reuseSolver: true })
  } else {
    cachedBox.updateConfig(payload)
  }

  const rawResults = await cachedBox.solve()
  const normalizedPoints = normalizeSimulationResults(rawResults)

  if (normalizedPoints.length === 0) {
    throw new Error('No valid results after normalization')
  }

  const { filteredResults, excludedResults } = filterProductConcentrations(
    normalizedPoints,
    productConcentrationKeys
  )

  if (filteredResults.length > 0) {
    store.dispatch(setResults(filteredResults))
    store.dispatch(setExcludedResults(excludedResults))
    store.dispatch(
      setMetadata({
        mechanism: mechanismLabel,
        duration: conditions.basic.duration || 0,
      })
    )
    store.dispatch(setStatus('succeeded'))
  } else {
    console.error('No valid results after normalization')
    store.dispatch(setExcludedResults([]))
    store.dispatch(setStatus('failed'))
  }

  return {
    results: filteredResults,
    excludedResults,
    metadata: {
      mechanism: mechanismLabel,
      duration: conditions.basic.duration || 0,
    },
    payload,
  }
}
