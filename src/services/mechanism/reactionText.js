import { getReactionReactants } from '../simulation/local/mechanism'

// One equation formatter and one search for every list of reactions, so all pages show and
// find a reaction the same way. Both take a reaction with species names (see withSpeciesNames).

const PRODUCT_KEYS = ['products', 'gas-phase products', 'alkoxy products', 'nitrate products']

const asList = (value) => (Array.isArray(value) ? value : value ? [value] : [])

export const reactionReactantList = (reaction) => asList(getReactionReactants(reaction))

// All the products, including both branches of a BRANCHED reaction.
export const reactionProductList = (reaction) =>
  PRODUCT_KEYS.flatMap((key) => asList(reaction?.[key]))

// "2NO2 + O" -- a coefficient shows when it is not 1, also when it is below 1 (0.5OH).
export function formatComponents(components) {
  if (!components.length) return '∅'
  return components
    .map((component) => {
      const coefficient = Number(component?.coefficient)
      const prefix = Number.isFinite(coefficient) && coefficient !== 1 ? String(coefficient) : ''
      return `${prefix}${component?.name ?? ''}`
    })
    .join(' + ')
}

// "NO2 → NO + O", with ∅ for an empty side (an emission or a loss).
export const formatReactionEquation = (reaction) =>
  `${formatComponents(reactionReactantList(reaction))} → ${formatComponents(reactionProductList(reaction))}`

const normalize = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')

// A typed term matches a species when the species name starts with it, so a term can be typed
// part way. A leading coefficient (2NO2) is ignored.
const termMatches = (term, names) => {
  const withoutCoefficient = term.replace(/^\d*\.?\d+(?=[a-z(])/, '')
  return names.some((name) => name.startsWith(term) || name.startsWith(withoutCoefficient))
}

const sideMatches = (terms, names) => terms.every((term) => termMatches(term, names))

const terms = (text) => text.split('+').filter(Boolean)

// Whether a reaction matches a search. Case and spaces are ignored, and the order of the
// species on each side and the place of "+" do not matter:
//   "jno2"            the reaction name contains it
//   "o3"              a reactant or a product contains it
//   "HCL + O1D"       every term is a reactant, or every term is a product
//   "a -> b", "a→b"   every left term is a reactant and every right term is a product
export function reactionMatchesQuery(reaction, query) {
  const q = normalize(query)
  if (!q) return true
  if (normalize(reaction?.name).includes(q)) return true

  const reactants = reactionReactantList(reaction).map((c) => normalize(c?.name))
  const products = reactionProductList(reaction).map((c) => normalize(c?.name))

  const sides = q.split(/->|→/)
  if (sides.length === 2) {
    return sideMatches(terms(sides[0]), reactants) && sideMatches(terms(sides[1]), products)
  }

  const queryTerms = terms(q)
  if (queryTerms.length === 1) {
    return [...reactants, ...products].some((name) => name.includes(queryTerms[0]))
  }
  return sideMatches(queryTerms, reactants) || sideMatches(queryTerms, products)
}
