export const normalizeSimulationResults = (raw) => {
  // Handle column-oriented format: { columns: [...], data: { columnName: [...] } }
  if (raw && typeof raw === 'object' && raw.columns && raw.data) {
    const { columns, data } = raw
    const timeColumn = columns[0]
    const speciesColumns = columns.slice(1)

    if (!data[timeColumn] || !Array.isArray(data[timeColumn])) {
      return []
    }

    return data[timeColumn].map((time, index) => {
      const concentrations = {}
      speciesColumns.forEach((col) => {
        const values = data[col]
        if (Array.isArray(values) && values[index] !== undefined) {
          concentrations[col] = values[index]
        }
      })

      return {
        time,
        concentrations,
      }
    })
  }

  const points = Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : []
  if (points.length === 0) return []

  return points
    .map((point, i) => {
      if (!point || typeof point !== 'object') return null

      if (point.concentrations && typeof point.concentrations === 'object') {
        return {
          time: point.time ?? point.timestamp ?? i,
          concentrations: point.concentrations,
        }
      }

      const outConcentrations = {}
      Object.entries(point).forEach(([key, value]) => {
        if (key === 'time' || key === 'timestamp' || key === 'date' || key === 'concentrations') {
          return
        }

        if (typeof value === 'number') {
          outConcentrations[key] = value
        } else if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'number') {
          outConcentrations[key] = value[0]
        }
      })

      if (Object.keys(outConcentrations).length > 0) {
        return {
          time: point.time ?? point.timestamp ?? i,
          concentrations: outConcentrations,
        }
      }

      return null
    })
    .filter((pt) => pt !== null)
}
