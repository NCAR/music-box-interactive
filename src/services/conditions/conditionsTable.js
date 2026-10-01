import { hydrateInitialConditions, hydrateEvolvingConditions } from '../../utils/hydrateConditions'
import { DENSITY_SERIES_KEY } from '../../utils/environmentSeries'

// Shared model behind the conditions download and upload. Every condition column is
// identified by its "key": the header without its unit (ENV.temperature, CONC.O3,
// PHOTO.O2_1, SURF.rxn.effective radius), so a stored "CONC.O3" and an uploaded
// "CONC.O3.mol m-3" are the same column.

export const TEMPERATURE_HEADER = 'ENV.temperature.K'
export const PRESSURE_HEADER = 'ENV.pressure.Pa'
export const TEMPERATURE_KEY = 'ENV.temperature'
export const PRESSURE_KEY = 'ENV.pressure'
export const DENSITY_KEY = 'ENV.air number density'

export const CATEGORIES = [
  { id: 'environment', label: 'Environment', fileName: 'environment.csv' },
  { id: 'species', label: 'Species concentrations', fileName: 'species_concentrations.csv' },
  { id: 'rate', label: 'Rate parameters', fileName: 'rate_parameters.csv' },
]

// The mechanism reaction types that take a rate parameter from the conditions. A null unit
// writes the header without a unit, because the unit of the value depends on the reaction.
export const RATE_TYPES = [
  { reactionType: 'PHOTOLYSIS', prefix: 'PHOTO', label: 'Photolysis', unit: 's-1' },
  { reactionType: 'EMISSION', prefix: 'EMIS', label: 'Emission', unit: 'mol m-3 s-1' },
  { reactionType: 'FIRST_ORDER_LOSS', prefix: 'LOSS', label: 'Loss', unit: 's-1' },
  { reactionType: 'USER_DEFINED', prefix: 'USER', label: 'User defined', unit: null },
  { reactionType: 'SURFACE', prefix: 'SURF', label: 'Surface', unit: null },
]

const SURFACE_PROPERTIES = [
  { property: 'effective radius', unit: 'm' },
  { property: 'particle number concentration', unit: '# m-3' },
]

const ENVIRONMENT_ITEMS = [
  { key: TEMPERATURE_KEY, header: TEMPERATURE_HEADER, label: 'Temperature', group: 'Temperature' },
  { key: PRESSURE_KEY, header: PRESSURE_HEADER, label: 'Pressure', group: 'Pressure' },
  { key: DENSITY_KEY, header: DENSITY_SERIES_KEY, label: 'Air number density', group: 'Air density' },
]

// The units an upload may use for each column. Concentrations are always mol m-3, the unit
// the app stores them in.
const ACCEPTED_UNITS = {
  [TEMPERATURE_KEY]: ['K'],
  [PRESSURE_KEY]: ['Pa'],
  [DENSITY_KEY]: ['mol m-3'],
  CONC: ['', 'mol m-3'],
}

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

const hasName = (entry) => typeof entry?.name === 'string' && entry.name.trim() !== ''

// The header without its trailing unit segment. SURF headers keep their property segment.
export function headerKey(header) {
  const parts = String(header).split('.')
  const prefix = parts[0]
  if (prefix === 'ENV') return parts.length > 2 ? parts.slice(0, -1).join('.') : header
  if (prefix === 'SURF') return parts.length > 3 ? parts.slice(0, -1).join('.') : header
  return parts.slice(0, 2).join('.')
}

// The unit segment of a header, or '' when the header has none.
export function headerUnit(header) {
  const key = headerKey(header)
  return header.length > key.length ? header.slice(key.length + 1) : ''
}

export function isAcceptedUnit(key, unit) {
  const accepted = ACCEPTED_UNITS[key] ?? ACCEPTED_UNITS[key.split('.')[0]]
  return accepted ? accepted.includes(unit) : true
}

// Every header the conditions in Redux store, indexed by key. A stored header keeps its own
// spelling (and unit) when the app writes the column back.
function storedHeaders(conditions) {
  const headers = new Map()
  Object.keys(conditions?.rateConstants || {}).forEach((header) =>
    headers.set(headerKey(header), header)
  )
  Object.keys(conditions?.evolving?.additionalSeries || {}).forEach((header) =>
    headers.set(headerKey(header), header)
  )
  return headers
}

// Every condition column that the mechanism can use, in display order. Each item is
// { key, header, label, category, group }. `header` is the header that a download writes.
export function listConditionItems({ species = [], reactions = [], conditions } = {}) {
  const stored = storedHeaders(conditions)
  const items = ENVIRONMENT_ITEMS.map((item) => ({ ...item, category: 'environment' }))

  species.filter(hasName).forEach((entry) => {
    items.push({
      key: `CONC.${entry.name}`,
      header: `CONC.${entry.name}.mol m-3`,
      label: entry.name,
      category: 'species',
      group: 'Species',
    })
  })

  const seen = new Set(items.map((item) => item.key))
  const addRateItem = (item) => {
    if (seen.has(item.key)) return
    seen.add(item.key)
    items.push({ ...item, category: 'rate' })
  }

  RATE_TYPES.forEach((type) => {
    reactions
      .filter((reaction) => reaction?.type === type.reactionType && hasName(reaction))
      .forEach((reaction) => {
        if (type.prefix === 'SURF') {
          const prefix = `SURF.${reaction.name}.`
          const properties = SURFACE_PROPERTIES.map(({ property, unit }) => ({
            key: `${prefix}${property}`,
            header: `${prefix}${property}.${unit}`,
          }))
          // A stored property that is not one of the two known ones still gets a column.
          stored.forEach((header, key) => {
            if (key.startsWith(prefix) && !properties.some((p) => p.key === key)) {
              properties.push({ key, header })
            }
          })
          properties.forEach(({ key, header }) =>
            addRateItem({
              key,
              header: stored.get(key) ?? header,
              label: `${reaction.name} (${key.slice(prefix.length)})`,
              group: type.label,
            })
          )
          return
        }

        const key = `${type.prefix}.${reaction.name}`
        addRateItem({
          key,
          header: stored.get(key) ?? (type.unit ? `${key}.${type.unit}` : key),
          label: reaction.name,
          group: type.label,
        })
      })
  })

  return items
}

// The conditions in Redux, with the hydration that MechanismPage would do applied first.
// Without this, a download or an upload before the first visit to MechanismPage would miss
// the loaded example, and the later hydration would overwrite an upload.
export function withHydratedConditions(conditions, exampleId) {
  if (!exampleId) return conditions
  let next = conditions

  if (conditions?.hydration?.initialExampleId !== exampleId) {
    const hydrated = hydrateInitialConditions(conditions.conditions)
    next = {
      ...next,
      initial: {
        ...next.initial,
        ...(hydrated.temperature !== null ? { temperature: hydrated.temperature } : {}),
        ...(hydrated.pressure !== null ? { pressure: hydrated.pressure } : {}),
        concentrations: hydrated.concentrations,
      },
      rateConstants: hydrated.rateConstants,
    }
  }

  if (conditions?.hydration?.evolvingExampleId !== exampleId) {
    const hydrated = hydrateEvolvingConditions(conditions.conditions)
    next = {
      ...next,
      evolving: {
        ...next.evolving,
        enabled: hydrated.enabled,
        times: hydrated.times,
        temperature: hydrated.temperature,
        pressure: hydrated.pressure,
        additionalSeries: hydrated.additionalSeries,
      },
    }
  }

  return next
}

// The value that each column has at each time, as the solver sees it: an evolving value at
// t=0 overrides the initial value, the same as in buildConditionsManager. An unset cell has
// no entry. Returns { times, rows }, where rows is a Map of time -> Map of key -> number.
export function buildConditionsTable(conditions) {
  const initial = conditions?.initial || {}
  const evolving = conditions?.evolving || {}
  const rows = new Map([[0, new Map()]])

  const rowAt = (time) => {
    if (!rows.has(time)) rows.set(time, new Map())
    return rows.get(time)
  }
  const setCell = (time, key, value) => {
    if (isFiniteNumber(value)) rowAt(time).set(key, value)
  }

  setCell(0, TEMPERATURE_KEY, initial.temperature)
  setCell(0, PRESSURE_KEY, initial.pressure)
  Object.entries(initial.concentrations || {}).forEach(([species, value]) =>
    setCell(0, `CONC.${species}`, value)
  )
  Object.entries(conditions?.rateConstants || {}).forEach(([header, value]) =>
    setCell(0, headerKey(header), value)
  )

  if (evolving.enabled === true && Array.isArray(evolving.times)) {
    evolving.times.forEach((time, index) => {
      if (!isFiniteNumber(time)) return
      rowAt(time)
      setCell(time, TEMPERATURE_KEY, evolving.temperature?.[index])
      setCell(time, PRESSURE_KEY, evolving.pressure?.[index])
      Object.entries(evolving.additionalSeries || {}).forEach(([header, series]) =>
        setCell(time, headerKey(header), Array.isArray(series) ? series[index] : null)
      )
    })
  }

  const times = [...rows.keys()].sort((a, b) => a - b)
  return { times, rows }
}

// The number of times at which each key has a value. A key without data has no entry.
export function countDataPoints(table) {
  const counts = new Map()
  table.rows.forEach((row) => row.forEach((_, key) => counts.set(key, (counts.get(key) ?? 0) + 1)))
  return counts
}
