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
