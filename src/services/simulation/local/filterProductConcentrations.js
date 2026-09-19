/**
 * Splits each result point's concentrations into the species the UI shows (filteredResults)
 * and the tracer species injected by buildTracedSimulationPayload (excludedResults), which
 * feed the flow diagram/flux/reaction-rate tabs instead.
 */
export const filterProductConcentrations = (results, excludeConcentrationKeys) => {
  const excludeSet = new Set(excludeConcentrationKeys)
  const filteredResults = []
  const excludedResults = []

  for (const point of results) {
    if (!point || typeof point !== 'object' || !point.concentrations) {
      filteredResults.push(point)
      excludedResults.push({})
      continue
    }

    const filteredConcentrations = {}
    const excludedConcentrations = {}

    for (const [key, value] of Object.entries(point.concentrations)) {
      if (excludeSet.has(key)) {
        excludedConcentrations[key] = value
      } else {
        filteredConcentrations[key] = value
      }
    }

    filteredResults.push({ ...point, concentrations: filteredConcentrations })
    excludedResults.push({ time: point.time, concentrations: excludedConcentrations })
  }

  return {
    filteredResults,
    excludedResults,
  }
}
