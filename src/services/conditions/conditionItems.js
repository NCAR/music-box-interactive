import { isThirdBody } from '../simulation/local/speciesProperties'
import { rateReactionNames } from '../simulation/local/reactionNames'
import { concentrationColumnKey, concentrationHeader } from './speciesColumns'
import {
  RATE_TYPES,
  SURFACE_PROPERTIES,
  parseRateColumnKey,
  rateColumnKey,
  rateHeader,
  rateParameterUnit,
} from './rateColumns'
import {
  DENSITY_HEADER,
  PRESSURE_HEADER,
  TEMPERATURE_HEADER,
  columnValues,
  headerKey,
} from './table'

// The catalog of condition columns that the conditions download and upload offer. Each item
// is { key, header, matchKey, label, category, group }:
//   key      - the table column key: the header without its unit (see headerKey), or the
//              reaction-id key of a rate parameter (see rateColumns)
//   header   - the header that a download writes
//   matchKey - headerKey(header); an uploaded header with the same headerKey is this item

export const CATEGORIES = [
  { id: 'environment', label: 'Environment', fileName: 'environment.csv' },
  { id: 'species', label: 'Species concentrations', fileName: 'species_concentrations.csv' },
  { id: 'rate', label: 'Rate parameters', fileName: 'rate_parameters.csv' },
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

// Every rate parameter of the mechanism, in RATE_TYPES order, then mechanism order: one for
// each photolysis, emission, loss and user-defined reaction, and one for each property of a
// surface reaction (the known ones, plus any other that the table holds). Each is
// { key, prefix, reactionId, property, name, label, unit, header, typeLabel }.
export function listRateParameters(reactions = [], table = null) {
  const names = rateReactionNames(reactions)
  const storedSurfaceProperties = new Map()
  Object.keys(table?.columns || {}).forEach((key) => {
    const parsed = parseRateColumnKey(key)
    if (parsed?.prefix !== 'SURF') return
    if (!storedSurfaceProperties.has(parsed.reactionId))
      storedSurfaceProperties.set(parsed.reactionId, [])
    storedSurfaceProperties.get(parsed.reactionId).push(parsed.property)
  })

  return RATE_TYPES.flatMap((type) =>
    reactions
      .filter((reaction) => reaction?.type === type.reactionType && names.has(reaction.id))
      .flatMap((reaction) => {
        const name = names.get(reaction.id)
        const base = { prefix: type.prefix, reactionId: reaction.id, name, typeLabel: type.label }
        if (type.prefix !== 'SURF') {
          return [
            {
              ...base,
              key: rateColumnKey(type.prefix, reaction.id),
              property: null,
              label: name,
              unit: type.unit,
              header: rateHeader(type.prefix, name),
            },
          ]
        }
        const known = SURFACE_PROPERTIES.map((p) => p.property)
        const others = (storedSurfaceProperties.get(reaction.id) || []).filter(
          (p) => !known.includes(p)
        )
        return [...known, ...others].map((property) => ({
          ...base,
          key: rateColumnKey('SURF', reaction.id, property),
          property,
          label: `${name} ${property}`,
          unit: rateParameterUnit('SURF', property),
          header: rateHeader('SURF', name, property),
        }))
      })
  )
}

const hasName = (entry) => typeof entry?.name === 'string' && entry.name.trim() !== ''

// Every condition column that the mechanism can use, in display order.
export function listConditionItems({ species = [], reactions = [], table } = {}) {
  const items = ENVIRONMENT_ITEMS.map((item) => ({ ...item, matchKey: item.key }))

  // A third-body species gets its concentration from the air density, so it has no column.
  species
    .filter((entry) => hasName(entry) && !isThirdBody(entry))
    .forEach((entry) => {
      // The column is stored under the species id (see speciesColumns).
      items.push({
        key: concentrationColumnKey(entry.id),
        matchKey: `CONC.${entry.name}`,
        header: concentrationHeader(entry.name),
        label: entry.name,
        category: 'species',
        group: 'Species',
      })
    })

  listRateParameters(reactions, table).forEach((parameter) => {
    items.push({
      key: parameter.key,
      matchKey: headerKey(parameter.header),
      header: parameter.header,
      label: parameter.label,
      category: 'rate',
      group: parameter.typeLabel,
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
