import { getReactionReactants } from '../../../services/simulation/local/mechanism'

export const parseReactionString = (str) => {
  return str
    .split('+')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      const match = value.match(/^(\d*\.?\d*)\s*(.+)$/)

      if (match) {
        const coeff = match[1] ? parseFloat(match[1]) : 1.0
        return {
          name: match[2].trim(),
          coefficient: coeff,
        }
      }

      return {
        name: value,
        coefficient: 1.0,
      }
    })
}

// Generate a fallback label for unnamed reactions, e.g. "O1D + N2 -> O + N2".
// FlowGraph keys reaction nodes by reaction.name, so every reaction needs one; recreating the
// generated label lets the editor distinguish it from a name explicitly declared by the mechanism.
const componentsToString = (components = []) =>
  components
    .map((component) => {
      if (!component || typeof component !== 'object') {
        return ''
      }

      const name = component.name?.trim() ?? ''
      const coefficient = parseFloat(component.coefficient)
      return coefficient === 1 || Number.isNaN(coefficient) ? name : `${coefficient}${name}`
    })
    .join(' + ')

export const buildGeneratedReactionName = (reaction) => {
  const reactants = getReactionReactants(reaction)
  const products =
    reaction.products || reaction['gas-phase products'] || reaction['alkoxy products'] || []

  const left = componentsToString(Array.isArray(reactants) ? reactants : [reactants])
  const right = componentsToString(Array.isArray(products) ? products : [products])

  return right ? `${left} -> ${right}` : `${left} -> (removed)`
}

// True when a reaction name was generated rather than declared by the mechanism.
export const hasDeclaredName = (reaction) =>
  typeof reaction?.name === 'string' &&
  reaction.name.trim().length > 0 &&
  reaction.name !== buildGeneratedReactionName(reaction)

// The arrows that an equation can use between its two sides.
const EQUATION_ARROW = /→|->|=>|=/

// The species of one side or one field: "2NO2 + O". An empty text or "∅" is no species.
const parseSide = (text) => {
  const trimmed = String(text ?? '').trim()
  return trimmed === '' || trimmed === '∅' ? [] : parseReactionString(trimmed)
}

/**
 * Applies the typed species of each field to a reaction, such as {reactants: "2NO2"}.
 * @param {Object} reaction - A reaction with species names
 * @param {Object} values - The text of each field, by field key
 * @param {{key: string, label?: string, single?: boolean, required?: boolean}[]} fields
 *   The species fields of the reaction type (getReactionComponents)
 * @returns {{reaction: Object} | {error: string}}
 */
export function applyReactionComponents(reaction, values, fields) {
  const updated = { ...reaction }
  for (const field of fields) {
    const label = field.label ?? field.key
    const parsed = parseSide(values[field.key])
    if (parsed.length === 0 && field.required) return { error: `${label} cannot be empty.` }
    if (field.single) {
      if (parsed.length > 1) return { error: `${label} must be a single species.` }
      if (parsed.length === 1 && parsed[0].coefficient !== 1) {
        return { error: `${label} cannot have a coefficient.` }
      }
      updated[field.key] = parsed[0]?.name ?? ''
    } else {
      updated[field.key] = parsed
    }
  }
  return { reaction: updated }
}

// The reactant field and the product field of a type, when the reaction has one side of each.
// BRANCHED_NO_RO2 has two product lists, so one equation cannot say which product goes where.
function equationFields(fields) {
  const reactant = fields.find((field) => field.key === 'reactants' || field.single)
  const products = fields.filter((field) => field !== reactant)
  if (products.length > 1) return null
  return { reactant, product: products[0] }
}

// Whether the equation of this type can be edited as one text.
export const isEquationEditable = (fields) => equationFields(fields) !== null

/**
 * Applies an edited equation, such as "2NO2 → N2O4" or "O3 ->", to a reaction.
 * A side that the type does not have must be empty.
 * @returns {{reaction: Object} | {error: string}}
 */
export function applyReactionEquation(reaction, text, fields) {
  const sides = equationFields(fields)
  if (!sides) return { error: 'This reaction type has more than one product list.' }

  const parts = String(text).split(EQUATION_ARROW)
  if (parts.length !== 2) {
    return {
      error: 'The equation must have one arrow (→ or ->) between the reactants and the products.',
    }
  }

  const values = {}
  for (const [field, part, sideName] of [
    [sides.reactant, parts[0], 'reactants'],
    [sides.product, parts[1], 'products'],
  ]) {
    if (field) values[field.key] = part
    else if (parseSide(part).length > 0) return { error: `This reaction type has no ${sideName}.` }
  }

  const labeled = fields.map((field) => ({
    ...field,
    label:
      field === sides.reactant ? (field.single ? 'The reactant' : 'The reactants') : 'The products',
  }))
  return applyReactionComponents(reaction, values, labeled)
}
