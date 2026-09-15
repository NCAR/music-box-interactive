import { parseConditions, ConditionsManager } from '@ncar/music-box'

// Shared hydration logic for initial and evolving conditions. Flattening {headers, rows}
// CSV blocks, and classifying a column as temperature, a concentration, or a rate constant,
// is delegated to @ncar/music-box (parseConditions, ConditionsManager) rather than re-derived
// here -- this app should not need to know the CONC./ENV./PHOTO. column convention itself.
//
// A snapshot row's own time.s is read as-is, never invented or rewritten: ConditionsManager
// only groups rows by whatever time.s they actually have, it does not require time.s === 0.

// Every conditions block, regardless of what file (if any) it came from -- the app does not
// track or key off original CSV filenames or example-specific slots. `conditions` is the
// music-box v1 conditions object as loaded (state.conditions.conditions), not a separate copy.
const dataBlocks = (conditions) => conditions?.data || []

export function hydrateInitialConditions(conditions) {
  const blocks = dataBlocks(conditions)

  // A single-row block is a snapshot, not a time series, so it counts as initial-condition
  // data too. Multi-row blocks are excluded so a genuinely evolving series (e.g. Chapman's
  // photolysis rates) doesn't also get a static "initial" copy of itself.
  const snapshotBlocks = blocks.filter(
    (block) => block?.headers?.length && block?.rows?.length === 1
  )
  const snapshotRows = parseConditions({ data: snapshotBlocks })
  const snapshotConds = new ConditionsManager(snapshotRows)

  // A config's ENV columns may only live on a genuinely evolving (multi-row) block. Borrow
  // temperature/pressure from its earliest point; concentrations and rate constants stay
  // snapshot-only, so a borrowed point never leaks a rate constant into "initial".
  const fallbackEvolvingBlock = blocks.find((block) => {
    const headers = block?.headers || []
    const rows = block?.rows || []
    return (
      rows.length > 1 &&
      headers.includes('time.s') &&
      headers.some((header) => typeof header === 'string' && header.startsWith('ENV.'))
    )
  })
  const fallbackAllRows = fallbackEvolvingBlock
    ? parseConditions({ data: [fallbackEvolvingBlock] })
    : []
  const earliestFallbackRow =
    fallbackAllRows.length > 0
      ? fallbackAllRows.reduce((earliest, row) =>
          row['time.s'] < earliest['time.s'] ? row : earliest
        )
      : null

  // The fallback row is listed first so a snapshot row at the same time.s overrides it --
  // ConditionsManager keeps input order for rows tied on time.s once it sorts by time.
  const envConds = new ConditionsManager([earliestFallbackRow, ...snapshotRows].filter(Boolean))
  let nextTemperature = null
  let nextPressure = null
  envConds.timePoints.forEach((point) => {
    if (point.temp !== null) nextTemperature = point.temp
    if (point.pressure !== null) nextPressure = point.pressure
  })

  const nextConcentrations = {}
  Object.values(snapshotConds.concentrationEvents).forEach((speciesValues) => {
    Object.assign(nextConcentrations, speciesValues)
  })

  // Raw (unit-suffix-included) headers, since buildSolverConditions writes these same keys
  // back out as a CSV header for the solver.
  const nextRateConstants = {}
  snapshotConds.timePoints.forEach((point) => {
    Object.assign(nextRateConstants, point.rawRateParams)
  })

  return {
    temperature: nextTemperature,
    pressure: nextPressure,
    concentrations: nextConcentrations,
    rateConstants: nextRateConstants,
  }
}

export function hydrateEvolvingConditions(conditions) {
  // A single row is a snapshot, not a time series -- require more than one point to call
  // it evolving.
  const evolvingBlock = dataBlocks(conditions).find((block) => {
    const headers = block?.headers || []
    const rows = block?.rows || []
    return (
      rows.length > 1 &&
      headers.includes('time.s') &&
      headers.includes('ENV.pressure.Pa') &&
      headers.includes('ENV.temperature.K')
    )
  })

  const empty = { enabled: false, times: [], temperature: [], pressure: [], additionalSeries: {} }

  if (!evolvingBlock?.headers?.length || !evolvingBlock?.rows?.length) {
    return empty
  }

  const validRows = parseConditions({ data: [evolvingBlock] })
    .filter(
      (row) =>
        Number.isFinite(row['time.s']) &&
        Number.isFinite(row['ENV.pressure.Pa']) &&
        Number.isFinite(row['ENV.temperature.K'])
    )
    .sort((a, b) => a['time.s'] - b['time.s'])

  if (validRows.length === 0) {
    return empty
  }

  const additionalHeaders = evolvingBlock.headers.filter(
    (header) => header !== 'time.s' && header !== 'ENV.pressure.Pa' && header !== 'ENV.temperature.K'
  )
  const additionalSeries = Object.fromEntries(
    additionalHeaders.map((header) => [header, validRows.map((row) => row[header])])
  )

  return {
    enabled: true,
    times: validRows.map((row) => row['time.s']),
    pressure: validRows.map((row) => row['ENV.pressure.Pa']),
    temperature: validRows.map((row) => row['ENV.temperature.K']),
    additionalSeries,
  }
}
