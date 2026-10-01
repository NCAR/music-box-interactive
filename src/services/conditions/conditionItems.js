import {
  DENSITY_HEADER,
  PRESSURE_HEADER,
  TEMPERATURE_HEADER,
  columnValues,
  headerKey,
} from './table'

// The catalog of condition columns that the conditions download and upload offer. Each item
// is { key, header, label, category, group }. `key` is the header without its unit (see
// headerKey), so a stored "CONC.O3" and an uploaded "CONC.O3.mol m-3" are the same item.

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
  { header: TEMPERATURE_HEADER, label: 'Temperature', group: 'Temperature' },
  { header: PRESSURE_HEADER, label: 'Pressure', group: 'Pressure' },
  { header: DENSITY_HEADER, label: 'Air number density', group: 'Air density' },
].map((item) => ({ ...item, key: headerKey(item.header), category: 'environment' }))

// The units an upload may use for each column. The solver reads temperature, pressure and
// air density only in these units, and the app stores concentrations in mol m-3.
const ACCEPTED_UNITS = {
  [headerKey(TEMPERATURE_HEADER)]: ['K'],
  [headerKey(PRESSURE_HEADER)]: ['Pa'],
  [headerKey(DENSITY_HEADER)]: ['mol m-3'],
  CONC: ['', 'mol m-3'],
}

export function isAcceptedUnit(key, unit) {
  const accepted = ACCEPTED_UNITS[key] ?? ACCEPTED_UNITS[key.split('.')[0]]
  return accepted ? accepted.includes(unit) : true
}

const hasName = (entry) => typeof entry?.name === 'string' && entry.name.trim() !== ''

// Every condition column that the mechanism can use, in display order. A rate parameter
// that the table already holds keeps its own header (and unit).
export function listConditionItems({ species = [], reactions = [], table } = {}) {
  const stored = new Map(
    Object.keys(table?.columns || {}).map((header) => [headerKey(header), header])
  )
  const items = [...ENVIRONMENT_ITEMS]

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

// The number of times at which each key has a value. A key without data has no entry.
export function countDataPoints(table) {
  const counts = new Map()
  Object.keys(table?.columns || {}).forEach((header) => {
    const count = columnValues(table, header).filter((value) => value !== null).length
    if (count > 0) counts.set(headerKey(header), (counts.get(headerKey(header)) ?? 0) + count)
  })
  return counts
}
