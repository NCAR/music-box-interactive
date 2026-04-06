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
