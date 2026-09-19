import { parseConditions, ConditionsManager } from '@ncar/music-box'

// Shared hydration for initial/evolving conditions. Column classification (temperature,
// concentration, rate constant) comes from @ncar/music-box's ConditionsManager, not a
// regex here. A row's own time.s is read as-is, never rewritten.

// Every block in conditions.data, whatever file it came from.
const dataBlocks = (conditions) => conditions?.data || []

export function hydrateInitialConditions(conditions) {
  const blocks = dataBlocks(conditions)

  // A single-row block is a snapshot (initial condition). Multi-row blocks are excluded so
  // an evolving series isn't also read as a static initial value.
  const snapshotBlocks = blocks.filter(
    (block) => block?.headers?.length && block?.rows?.length === 1
  )
  const snapshotRows = parseConditions({ data: snapshotBlocks })
  const snapshotConds = new ConditionsManager(snapshotRows)

  // Some configs only set ENV columns on the evolving block. Borrow temperature/pressure
  // from its earliest point; concentrations and rate constants stay snapshot-only.
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

  // Fallback row goes first so a snapshot at the same time.s overrides it (stable sort).
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

  // Raw header (unit included): buildSolverConditions writes it straight back to a CSV header.
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
  // Require more than one row to count as evolving, not just a snapshot. Some examples (e.g.
  // Analytical) carry a legacy single-row conditions block alongside their real initial-conditions
  // CSV; without this check it gets mistaken for an evolving series and its (stale) values
  // silently win over the real initial conditions -- see ConditionsManager's "inline data takes
  // precedence" merge in the music-box package.
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
