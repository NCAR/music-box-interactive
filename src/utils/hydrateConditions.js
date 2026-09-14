import { parseConditions, ConditionsManager } from '@ncar/music-box'

// Shared hydration logic for initial and evolving conditions. Flattening {headers, rows}
// CSV blocks, and classifying temperature/pressure/concentrations from them, is delegated
// to @ncar/music-box's own parseConditions()/ConditionsManager -- the same parsing the
// solver itself uses when it later runs this same conditions object -- instead of
// re-deriving it from raw column headers here.
//
// Rate-constant and additionalSeries keys are an exception: they are kept as the raw
// header string (e.g. "PHOTO.O2_1.s-1"), matching the header ConditionsManager itself
// would strip the unit from, because buildSolverConditions round-trips those same keys
// verbatim back into a CSV header when it rebuilds the solver payload later.

const isRateParamHeader = (header) =>
  header !== 'time.s' && !header.startsWith('ENV.') && !header.startsWith('CONC.')

export function hydrateInitialConditions(exampleFiles) {
  const getValidBlock = (block) => (block?.headers?.length && block?.rows?.length ? block : null)

  // A single-row block is a snapshot, not a time series, so it is always safe to treat as
  // more initial-condition data -- the same way the three named blocks below already are.
  // This is what lets an uploaded config (which has no named slots, only `data`) hydrate the
  // Initial tab the same way a bundled example does. Multi-row blocks are excluded: a
  // mechanism whose rate parameters genuinely evolve (e.g. Chapman's photolysis rates)
  // should not also get a static "initial" copy of them from the first row of that series.
  const snapshotBlocks = [
    getValidBlock(exampleFiles?.initial_conditions),
    getValidBlock(exampleFiles?.initial_concentrations),
    getValidBlock(exampleFiles?.initial_reaction_rates),
    ...(exampleFiles?.data || []).filter(
      (block) => block?.headers?.length && block?.rows?.length === 1
    ),
  ].filter(Boolean)
  const snapshotRows = parseConditions({ data: snapshotBlocks })

  // A config's own ENV columns may live only on a multi-row (evolving) block instead of any
  // single-row snapshot -- e.g. an initial_concentrations.csv with no ENV columns of its own,
  // borrowing temperature/pressure from the evolving series' first point. Only temperature
  // and pressure borrow this way; concentrations stay snapshot-only, below.
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

  // Snapshot blocks take priority; the fallback only fills in what they left unset. Passing
  // fallback rows first and snapshot rows second means snapshot values win the accumulation
  // in getConditionsAtTime, which applies each point in order and lets a later one override.
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
  // A single row is an initial-condition snapshot, not a time series, even when it happens
  // to carry ENV.* columns -- require more than one point to call it evolving.
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
