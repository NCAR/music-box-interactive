import { parseConditions, ConditionsManager } from '@ncar/music-box'

// Shared hydration logic for initial and evolving conditions. Classifying
// temperature/pressure/concentrations is delegated to @ncar/music-box's
// parseConditions()/ConditionsManager instead of re-derived from raw headers here.
//
// Rate-constant and additionalSeries keys stay as the raw header string (unit suffix
// included), since buildSolverConditions writes those same keys back out as a CSV header.

const isRateParamHeader = (header) =>
  header !== 'time.s' && !header.startsWith('ENV.') && !header.startsWith('CONC.')

export function hydrateInitialConditions(exampleFiles) {
  const getValidBlock = (block) => (block?.headers?.length && block?.rows?.length ? block : null)

  // A single-row block is a snapshot, not a time series, so it counts as initial-condition
  // data too. Multi-row blocks are excluded so a genuinely evolving series (e.g. Chapman's
  // photolysis rates) doesn't also get a static "initial" copy of itself.
  const snapshotBlocks = [
    getValidBlock(exampleFiles?.initial_conditions),
    getValidBlock(exampleFiles?.initial_concentrations),
    getValidBlock(exampleFiles?.initial_reaction_rates),
    ...(exampleFiles?.data || []).filter(
      (block) => block?.headers?.length && block?.rows?.length === 1
    ),
  ].filter(Boolean)
  const snapshotRows = parseConditions({ data: snapshotBlocks })

  // A config's ENV columns may only live on a multi-row (evolving) block. Borrow
  // temperature/pressure from its first point; concentrations stay snapshot-only.
  const fallbackEvolvingBlock = (exampleFiles?.data || []).find((block) => {
    const headers = block?.headers || []
    const rows = block?.rows || []
    return (
      rows.length > 0 &&
      headers.includes('time.s') &&
      headers.some((header) => typeof header === 'string' && header.startsWith('ENV.'))
    )
  })
  const fallbackRows = fallbackEvolvingBlock ? parseConditions({ data: [fallbackEvolvingBlock] }) : []

  const hasHeader = (rows, name) => rows.some((row) => Object.prototype.hasOwnProperty.call(row, name))

  // Fallback rows go first so snapshot rows (added after) win getConditionsAtTime's
  // accumulation.
  const mergedManager = new ConditionsManager([...fallbackRows, ...snapshotRows])
  const { temperature, pressure } = mergedManager.getConditionsAtTime(0)

  const nextTemperature =
    hasHeader(snapshotRows, 'ENV.temperature.K') || hasHeader(fallbackRows, 'ENV.temperature.K')
      ? temperature
      : null
  const nextPressure =
    hasHeader(snapshotRows, 'ENV.pressure.Pa') || hasHeader(fallbackRows, 'ENV.pressure.Pa')
      ? pressure
      : null

  const snapshotManager = new ConditionsManager(snapshotRows)
  const nextConcentrations = { ...(snapshotManager.concentrationEvents[0] || {}) }

  const nextRateConstants = {}
  snapshotRows.forEach((row) => {
    Object.entries(row).forEach(([header, value]) => {
      if (isRateParamHeader(header) && Number.isFinite(value)) {
        nextRateConstants[header] = value
      }
    })
  })

  return {
    temperature: nextTemperature,
    pressure: nextPressure,
    concentrations: nextConcentrations,
    rateConstants: nextRateConstants,
  }
}

export function hydrateEvolvingConditions(exampleFiles) {
  const boulderBlock = exampleFiles?.boulder
  // A single row is a snapshot, not a time series -- require more than one point to call
  // it evolving.
  const fallbackEvolvingBlock = (exampleFiles?.data || []).find((block) => {
    const headers = block?.headers || []
    const rows = block?.rows || []
    return (
      rows.length > 1 &&
      headers.includes('time.s') &&
      headers.includes('ENV.pressure.Pa') &&
      headers.includes('ENV.temperature.K')
    )
  })
  const evolvingBlock =
    boulderBlock?.headers?.length && boulderBlock?.rows?.length ? boulderBlock : fallbackEvolvingBlock

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
