import { MICM, SolverType, SolverState } from '@ncar/musica'
import { ConditionsManager, parseBoxModelOptions, parseConditions } from '@ncar/music-box'
import { buildTracedSimulationPayload } from './tracedPayload'

// Re-yield to the browser roughly this often (in chemistry timesteps), not on every one --
// otherwise the setTimeout/microtask overhead itself would dominate a fast vectorized solve.
const YIELD_EVERY_N_STEPS = 20

// Thrown when the caller's isCancelled() returns true mid-scan. Distinct from every other
// thrown error here (all of which mean "this mechanism isn't supported by the fast path, fall
// back to solving cells one at a time") -- a cancellation should just stop, not trigger a
// slower retry of a scan the user no longer wants.
export class GridScanCancelled extends Error {}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// MusicBox's own lambda-reaction support (registerLambdaCallbacks/evaluateJsLambda in
// @ncar/music-box's music_box.js) is not part of that package's public API. Duplicating it here
// would risk silently drifting out of sync with the real implementation, so mechanisms that use
// it fall back to the sequential per-cell path (which goes through MusicBox itself) instead.
function hasLambdaReactions(mechanism) {
  const reactions = Array.isArray(mechanism?.reactions) ? mechanism.reactions : []
  return reactions.some((reaction) => reaction?.type === 'LAMBDA_RATE_CONSTANT')
}

// Builds a { name: [v0, v1, ...] } rate-parameter map across cells for one setUserDefinedRateParameters
// call. Unlike MusicBox.solve(), this does not prune unrecognized keys first (that pruning helper
// is also private to @ncar/music-box) -- an unrecognized key here surfaces as a thrown error from
// the native call, which the caller treats the same as any other fast-path failure: fall back.
function mergeRateParams(perCellConditions) {
  const keys = new Set()
  perCellConditions.forEach((c) => {
    if (c.rateParams) Object.keys(c.rateParams).forEach((key) => keys.add(key))
  })
  const merged = {}
  keys.forEach((key) => {
    merged[key] = perCellConditions.map((c) => c.rateParams?.[key] ?? 0)
  })
  return merged
}

// Applies whichever cells have a concentration event at `time` (mirrors MusicBox.solve()'s
// single-cell `state.setConcentrations(concentrationEvents[t])`, array-ified). A cell without an
// event for a given species at this exact time keeps its current value -- read back from the
// state itself -- rather than being zeroed, since a vectorized setConcentrations call necessarily
// sets every cell at once.
function applyConcentrationEvents(state, condMgrs, time) {
  const perCellEvents = condMgrs.map((mgr) => mgr.concentrationEvents[time])
  if (perCellEvents.every((event) => !event)) return

  const keys = new Set()
  perCellEvents.forEach((event) => {
    if (event) Object.keys(event).forEach((key) => keys.add(key))
  })
  if (keys.size === 0) return

  const needsCurrent = perCellEvents.some((event) => !event)
  const current = needsCurrent ? state.getConcentrations() : null

  const updates = {}
  keys.forEach((key) => {
    updates[key] = perCellEvents.map((event, i) =>
      event && event[key] !== undefined ? event[key] : (current?.[key]?.[i] ?? 0)
    )
  })
  state.setConcentrations(updates)
}

/**
 * Solves N independent grid cells (same mechanism, different conditions) with one batched,
 * vectorized MICM call per chemistry timestep, instead of N separate single-cell solves.
 *
 * Bypasses @ncar/music-box's MusicBox wrapper entirely and drives @ncar/musica's MICM/State
 * directly. MusicBox always builds a 1-grid-cell state and never exposes a batched mode, but
 * the layer underneath it is built for exactly this: MICM.createState(N) plus SolverType.rosenbrock
 * (the vector-ordered variant -- MusicBox always compiles the standard-ordered one, which does
 * not get the SIMD-across-cells benefit).
 *
 * Mirrors MusicBox.solve()'s own timestep loop (event application, then conditions/rate-param
 * update, then integrate), generalized from one cell to N, and simplified: this only needs each
 * cell's *final* concentrations, not a full time series, so none of solve()'s per-output-step
 * column collection applies here -- the loop runs to completion and reads state.getConcentrations()
 * once at the end.
 *
 * Throws for a mechanism this fast path cannot safely handle (see hasLambdaReactions), or for
 * any other failure -- the caller is expected to fall back to solving cells one at a time via
 * the ordinary MusicBox-based path in that case. Throws GridScanCancelled specifically if
 * isCancelled() returns true mid-scan; callers should stop rather than fall back in that case.
 *
 * @param {Object} params
 * @param {Object} params.mechanismData - Redux mechanism slice state.
 * @param {Object[]} params.conditionsList - One full Redux-shaped conditions object per grid
 *   cell; only initial.concentrations is expected to differ between them.
 * @param {(fraction: number) => void} [params.onProgress] - Called with 0..1 as the shared
 *   timeline advances.
 * @param {() => boolean} [params.isCancelled] - Polled periodically; throws GridScanCancelled
 *   as soon as it returns true.
 * @returns {Promise<Object[]>} One { speciesName: concentration } map per cell, same order as
 *   conditionsList, using bare species names (not "CONC.x.mol m-3").
 *
 * Verified (see __tests__/vectorizedGridScan.verify.test.js) to match the sequential
 * MusicBox-based path bit-for-bit for every real chemistry species. The one known divergence is
 * the reaction-rate tracer species buildTracedSimulationPayload injects (accumulated
 * differently here than in MusicBox.solve()'s own loop) -- harmless, since
 * filterProductConcentrations already strips those out of simulation.results before Isopleths'
 * output-species picker ever sees them, so a caller can never actually select one.
 */
export async function runVectorizedGridScan({
  mechanismData,
  conditionsList,
  onProgress,
  isCancelled,
}) {
  const numberOfGridCells = conditionsList.length
  if (numberOfGridCells === 0) return []

  const perCell = conditionsList.map((conditions) =>
    buildTracedSimulationPayload({ mechanismData, conditions })
  )
  const mechanism = perCell[0].payload.mechanism

  if (hasLambdaReactions(mechanism)) {
    throw new Error('Mechanism uses LAMBDA_RATE_CONSTANT reactions; unsupported by the fast grid-scan path')
  }

  const { chemTimeStep, simulationLength, maxIterations } = parseBoxModelOptions(perCell[0].payload)

  const micm = MICM.fromMechanism({ getJSON: () => mechanism }, SolverType.rosenbrock)
  try {
    const state = micm.createState(numberOfGridCells)
    try {
      const condMgrs = perCell.map(({ payload }) => new ConditionsManager(parseConditions(payload.conditions)))

      const eventTimesSet = new Set()
      condMgrs.forEach((mgr) => {
        Object.keys(mgr.concentrationEvents).forEach((t) => eventTimesSet.add(Number(t)))
      })
      const sortedEventTimes = [...eventTimesSet].sort((a, b) => a - b)
      let nextEventIdx = 0

      const t0s = condMgrs.map((mgr) => mgr.getConditionsAtTime(0))
      state.setConditions({
        temperatures: t0s.map((t) => t.temperature),
        pressures: t0s.map((t) => t.pressure),
        airDensities: t0s.map((t) => t.airDensity),
      })
      if (sortedEventTimes[0] === 0) {
        applyConcentrationEvents(state, condMgrs, 0)
        nextEventIdx = 1
      }
      state.setUserDefinedRateParameters(mergeRateParams(t0s))

      let currTime = 0
      let stepCount = 0

      // Strict less-than: MusicBox.solve()'s own outer loop uses <=, but it only ever
      // integrates another chemTimeStep after confirming (via its output-time bookkeeping,
      // not reproduced here) that there's still unfinished duration left. Without that check,
      // <= would run one extra full chemTimeStep once currTime lands exactly on simulationLength.
      while (currTime < simulationLength) {
        while (nextEventIdx < sortedEventTimes.length && sortedEventTimes[nextEventIdx] <= currTime) {
          applyConcentrationEvents(state, condMgrs, sortedEventTimes[nextEventIdx])
          nextEventIdx++
        }

        const conds = condMgrs.map((mgr) => mgr.getConditionsAtTime(currTime))
        state.setConditions({
          temperatures: conds.map((c) => c.temperature),
          pressures: conds.map((c) => c.pressure),
          airDensities: conds.map((c) => c.airDensity),
        })
        state.setUserDefinedRateParameters(mergeRateParams(conds))

        let elapsed = 0
        let iters = 0
        while (elapsed < chemTimeStep) {
          if (maxIterations !== null && ++iters > maxIterations) {
            throw new Error(
              `Solver exceeded maximum substep iterations (${maxIterations}) at time ${currTime.toFixed(2)} s`
            )
          }

          const result = micm.solve(state, chemTimeStep - elapsed)
          if (result.state !== SolverState.Converged) {
            throw new Error(
              `Solver failed to converge at time ${currTime.toFixed(2)} s with state ${result.state}`
            )
          }

          elapsed += result.stats.final_time
          currTime += result.stats.final_time
        }

        stepCount++
        if (stepCount % YIELD_EVERY_N_STEPS === 0) {
          onProgress?.(Math.min(1, currTime / simulationLength))
          if (isCancelled?.()) {
            throw new GridScanCancelled('Grid scan cancelled')
          }
          await sleep(0)
        }
      }

      onProgress?.(1)

      const finalConcentrations = state.getConcentrations()
      return Array.from({ length: numberOfGridCells }, (_, i) => {
        const result = {}
        for (const [name, values] of Object.entries(finalConcentrations)) {
          result[name] = values[i]
        }
        return result
      })
    } finally {
      state.delete()
    }
  } finally {
    micm.delete()
  }
}
