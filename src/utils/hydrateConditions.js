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
  const empty = { enabled: false, times: [], temperature: [], pressure: [], additionalSeries: {} }
  const isEnvOnlyHeader = (header) =>
    header === 'time.s' || header === 'ENV.temperature.K' || header === 'ENV.pressure.Pa'

  const relevantBlocks = dataBlocks(conditions).filter((block) => {
    const headers = block?.headers || []
    const rows = block?.rows || []
    if (!headers.includes('time.s')) return false
    if (rows.length > 1) return true
    return headers.some((header) => !isEnvOnlyHeader(header) && !header.startsWith('CONC.'))
  })

  if (relevantBlocks.length === 0) {
    return empty
  }

  const rows = parseConditions({ data: relevantBlocks }).filter((row) =>
    Number.isFinite(row['time.s'])
  )

  if (rows.length === 0) {
    return empty
  }

  const byTime = new Map()
  for (const row of rows) {
    const t = row['time.s']
    byTime.set(t, { ...(byTime.get(t) || {}), ...row })
  }
  const mergedRows = [...byTime.values()].sort((a, b) => a['time.s'] - b['time.s'])

  // Left blank (null) when a row doesn't set it
  const times = mergedRows.map((row) => row['time.s'])
  const temperature = mergedRows.map((row) =>
    Number.isFinite(row['ENV.temperature.K']) ? row['ENV.temperature.K'] : null
  )
  const pressure = mergedRows.map((row) =>
    Number.isFinite(row['ENV.pressure.Pa']) ? row['ENV.pressure.Pa'] : null
  )

  const allHeaders = new Set()
  relevantBlocks.forEach((block) => (block.headers || []).forEach((header) => allHeaders.add(header)))
  const additionalHeaders = [...allHeaders].filter(
    (header) =>
      header !== 'time.s' &&
      header !== 'ENV.temperature.K' &&
      header !== 'ENV.pressure.Pa' &&
      !header.startsWith('CONC.')
  )
  const additionalSeries = Object.fromEntries(
    additionalHeaders.map((header) => [
      header,
      mergedRows.map((row) => (row[header] !== undefined ? row[header] : null)),
    ])
  )

  return {
    enabled: true,
    times,
    temperature,
    pressure,
    additionalSeries,
  }
}
