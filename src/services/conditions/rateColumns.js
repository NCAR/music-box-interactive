import { RATE_PARAMETER_PREFIXES, rateReactionNames } from '../simulation/local/reactionNames'
import { columnValues } from './table'

// A rate parameter belongs to a reaction, so the conditions table stores its column under the
// reaction id, not under its name: PHOTO#<id>, or SURF#<id>#<property> for a surface reaction.
// A rename, or an edit of the species of an unnamed reaction, then keeps the values. The
// PREFIX.name.unit header is made only where a header is needed: the solver payload and the
// conditions download. The key has no ".", so headerKey() gives the key back unchanged.

// The rate-parameter types, with the unit of the value. A surface reaction has one value for
// each of SURFACE_PROPERTIES instead.
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

const KEY_PATTERN = /^(PHOTO|EMIS|LOSS|USER|SURF)#([^#]+)(?:#(.+))?$/

export const rateColumnKey = (prefix, reactionId, property = null) =>
  property ? `${prefix}#${reactionId}#${property}` : `${prefix}#${reactionId}`

// { prefix, reactionId, property } for a rate-parameter column key, or null.
export function parseRateColumnKey(key) {
  const match = KEY_PATTERN.exec(String(key))
  return match ? { prefix: match[1], reactionId: match[2], property: match[3] ?? null } : null
}

// The unit to show for a rate-parameter value. `property` is only for a surface reaction.
export function rateParameterUnit(prefix, property = null) {
  if (prefix === 'SURF') {
    return SURFACE_PROPERTIES.find((p) => p.property === property)?.displayUnit ?? null
  }
  return RATE_TYPES.find((type) => type.prefix === prefix)?.unit ?? null
}

// The music-box header of a rate parameter: PREFIX.name.unit, or SURF.name.property.unit.
export function rateHeader(prefix, name, property = null) {
  if (prefix === 'SURF') {
    const unit = SURFACE_PROPERTIES.find((p) => p.property === property)?.unit
    return unit ? `SURF.${name}.${property}.${unit}` : `SURF.${name}.${property}`
  }
  const unit = RATE_TYPES.find((type) => type.prefix === prefix)?.unit
  return unit ? `${prefix}.${name}.${unit}` : `${prefix}.${name}`
}

// The header for a rate-parameter column key, with the current name of its reaction. Null when
// the reaction is not in `names` (see rateReactionNames).
export function headerForRateColumn(key, names) {
  const parsed = parseRateColumnKey(key)
  if (!parsed || !names.has(parsed.reactionId)) return null
  return rateHeader(parsed.prefix, names.get(parsed.reactionId), parsed.property)
}

const RATE_HEADER_PREFIXES = new Set(Object.values(RATE_PARAMETER_PREFIXES))

// Whether a header is a music-box rate-parameter header (PHOTO.*, EMIS.*, ...).
export const isRateHeader = (header) => RATE_HEADER_PREFIXES.has(String(header).split('.')[0])

// The column key for a music-box rate-parameter header, found by the reaction name (the
// configured name, or the generated name of an unnamed reaction). Null when no reaction of
// that type has that name.
export function rateColumnForHeader(header, reactions, names = rateReactionNames(reactions)) {
  const parts = String(header).split('.')
  const prefix = parts[0]
  if (!RATE_HEADER_PREFIXES.has(prefix) || parts.length < 2) return null
  const name = parts[1]
  const reaction = reactions.find(
    (r) => RATE_PARAMETER_PREFIXES[r.type] === prefix && names.get(r.id) === name
  )
  if (!reaction) return null
  if (prefix !== 'SURF') return rateColumnKey(prefix, reaction.id)
  const property = parts.length > 3 ? parts.slice(2, -1).join('.') : parts[2]
  return property ? rateColumnKey(prefix, reaction.id, property) : null
}

// Moves the rate-parameter header columns of a table to their reaction-id keys. Returns
// { table, unmatched }, where `unmatched` lists the rate headers that match no reaction. Those
// columns are left out: the solver would ignore them.
export function bindRateColumns(table, reactions) {
  const names = rateReactionNames(reactions)
  const columns = {}
  const unmatched = []

  Object.keys(table.columns).forEach((header) => {
    if (!isRateHeader(header)) {
      columns[header] = table.columns[header]
      return
    }
    const key = rateColumnForHeader(header, reactions, names)
    if (key) columns[key] = columnValues(table, header)
    else unmatched.push(header)
  })

  return { table: { times: table.times, columns }, unmatched }
}

// The table without the rate-parameter columns of a reaction.
export function dropReactionColumns(table, reactionId) {
  const columns = Object.fromEntries(
    Object.entries(table.columns).filter(
      ([key]) => parseRateColumnKey(key)?.reactionId !== reactionId
    )
  )
  return Object.keys(columns).length === Object.keys(table.columns).length
    ? table
    : { times: table.times, columns }
}
