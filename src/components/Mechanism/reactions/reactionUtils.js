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
          'species name': match[2].trim().toUpperCase(),
          coefficient: coeff,
        }
      }

      return {
        'species name': value.toUpperCase(),
        coefficient: 1.0,
      }
    })
}

export const buildReactionName = (reactantsInput, productsInput) => {
  const normalizedReactants = reactantsInput.toUpperCase()
  const normalizedProducts = productsInput ? productsInput.toUpperCase() : ''

  return normalizedProducts
    ? `${normalizedReactants} → ${normalizedProducts}`
    : `${normalizedReactants} → (removed)`
}

// Generate a fallback label for unnamed reactions, e.g. "O1D + N2 -> O + N2".
// FlowGraph keys reaction nodes by reaction.name, so every reaction needs one; recreating the
// generated label lets the editor distinguish it from a name explicitly declared by the mechanism.
const componentsToString = (components = []) =>
  components
    .map((component) => {
      if (typeof component === 'string') {
        return component.trim().toUpperCase()
      }
      if (!component || typeof component !== 'object') {
        return ''
      }

      const name = component['species name']?.trim()?.toUpperCase() ?? ''
      const coefficient = parseFloat(component.coefficient)
      return coefficient === 1 || Number.isNaN(coefficient) ? name : `${coefficient}${name}`
    })
    .join(' + ')

export const buildGeneratedReactionName = (reaction) => {
  const reactants = reaction.reactants || reaction['gas-phase species'] || []
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
