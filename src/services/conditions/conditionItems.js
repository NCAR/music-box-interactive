import { isThirdBody } from '../simulation/local/speciesProperties'
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

// The mechanism reaction types that take a rate parameter from the conditions, with the unit
// of the value. A surface reaction has one value for each of SURFACE_PROPERTIES instead.
export const RATE_TYPES = [
  { reactionType: 'PHOTOLYSIS', prefix: 'PHOTO', label: 'Photolysis', unit: 's-1' },
  { reactionType: 'EMISSION', prefix: 'EMIS', label: 'Emission', unit: 'mol m-3 s-1' },
  { reactionType: 'FIRST_ORDER_LOSS', prefix: 'LOSS', label: 'Loss', unit: 's-1' },
  { reactionType: 'USER_DEFINED', prefix: 'USER', label: 'User defined', unit: 's-1' },
  { reactionType: 'SURFACE', prefix: 'SURF', label: 'Surface', unit: null },
]

// `unit` is the header unit that music-box uses. `displayUnit` is the unit that the app shows.
export const SURFACE_PROPERTIES = [
  { property: 'effective radius', unit: 'm', displayUnit: 'm' },
  { property: 'particle number concentration', unit: '# m-3', displayUnit: 'particles m-3' },
]

// The header for a new rate-parameter column: PREFIX.name.unit, or
// SURF.name.property.unit for a surface reaction.
export function defaultRateHeader(prefix, name, property = null) {
  if (prefix === 'SURF') {
    const known = SURFACE_PROPERTIES.find((p) => p.property === property)
    return known ? `SURF.${name}.${property}.${known.unit}` : `SURF.${name}.${property}`
  }
  const unit = RATE_TYPES.find((type) => type.prefix === prefix)?.unit
  return unit ? `${prefix}.${name}.${unit}` : `${prefix}.${name}`
}

// The unit to show for a rate-parameter value. `property` is only for a surface reaction.
export function rateParameterUnit(prefix, property = null) {
  if (prefix === 'SURF') {
    return SURFACE_PROPERTIES.find((p) => p.property === property)?.displayUnit ?? null
  }
  return RATE_TYPES.find((type) => type.prefix === prefix)?.unit ?? null
}

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

  // A third-body species gets its concentration from the air density, so it has no column.
  species
    .filter((entry) => hasName(entry) && !isThirdBody(entry))
    .forEach((entry) => {
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
          const properties = SURFACE_PROPERTIES.map(({ property }) => ({
            key: `${prefix}${property}`,
            header: defaultRateHeader('SURF', reaction.name, property),
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
          header: stored.get(key) ?? defaultRateHeader(type.prefix, reaction.name),
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
