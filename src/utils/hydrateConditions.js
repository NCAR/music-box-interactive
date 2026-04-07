// Shared hydration logic for initial and evolving conditions
export function hydrateInitialConditions(exampleFiles) {
  const getValidBlock = (block) => (block?.headers?.length && block?.rows?.length ? block : null)
  const initialConditionsBlock = getValidBlock(exampleFiles?.initial_conditions)
  const initialConcentrationsBlock = getValidBlock(exampleFiles?.initial_concentrations)
  const initialReactionRatesBlock = getValidBlock(exampleFiles?.initial_reaction_rates)
  const fallbackDataBlock = (exampleFiles?.data || []).find((block) => {
    const headers = block?.headers || []
    const rows = block?.rows || []
    return rows.length > 0 && headers.includes('time.s') && headers.some((header) => typeof header === 'string' && header.startsWith('ENV.'))
  })
  const blocksToHydrate = [initialConditionsBlock, initialConcentrationsBlock, initialReactionRatesBlock].filter(Boolean)
  let nextConcentrations = {}
  let nextRateConstants = {}
  let nextTemperature = null
  let nextPressure = null
  blocksToHydrate.forEach((block) => {
    const headers = block.headers || []
    const firstRow = block.rows?.[0] || []
    headers.forEach((header, index) => {
      const value = firstRow[index]
      if (header === 'ENV.temperature.K' && Number.isFinite(value)) nextTemperature = value
      if (header === 'ENV.pressure.Pa' && Number.isFinite(value)) nextPressure = value
      const concentrationMatch = /^CONC\.([^.]+)\./.exec(header)
      if (concentrationMatch && Number.isFinite(value)) nextConcentrations[concentrationMatch[1].toUpperCase()] = value
      const isTimeColumn = header === 'time.s'
      const isEnvironmentalColumn = header.startsWith('ENV.')
      if (!isTimeColumn && !isEnvironmentalColumn && !concentrationMatch && Number.isFinite(value)) nextRateConstants[header] = value
    })
  })
  if ((nextTemperature === null || nextPressure === null) && fallbackDataBlock) {
    const headers = fallbackDataBlock.headers || []
    const firstRow = fallbackDataBlock.rows?.[0] || []
    headers.forEach((header, index) => {
      const value = firstRow[index]
      if (nextTemperature === null && header === 'ENV.temperature.K' && Number.isFinite(value)) nextTemperature = value
      if (nextPressure === null && header === 'ENV.pressure.Pa' && Number.isFinite(value)) nextPressure = value
    })
  }
  return {
    temperature: nextTemperature,
    pressure: nextPressure,
    concentrations: nextConcentrations,
    rateConstants: nextRateConstants,
  }
}

export function hydrateEvolvingConditions(exampleFiles) {
  const boulderBlock = exampleFiles?.boulder
  const fallbackEvolvingBlock = (exampleFiles?.data || []).find((block) => {
    const headers = block?.headers || []
    const rows = block?.rows || []
    return rows.length > 0 && headers.includes('time.s') && headers.includes('ENV.pressure.Pa') && headers.includes('ENV.temperature.K')
  })
  const evolvingBlock = boulderBlock?.headers?.length && boulderBlock?.rows?.length ? boulderBlock : fallbackEvolvingBlock
  let evolvingHydrated = {
    enabled: false,
    times: [],
    temperature: [],
    pressure: [],
    additionalSeries: {},
  }
  if (evolvingBlock?.headers?.length && evolvingBlock?.rows?.length) {
    const timeIndex = evolvingBlock.headers.indexOf('time.s')
    const pressureIndex = evolvingBlock.headers.indexOf('ENV.pressure.Pa')
    const temperatureIndex = evolvingBlock.headers.indexOf('ENV.temperature.K')
    if (timeIndex !== -1 && pressureIndex !== -1 && temperatureIndex !== -1) {
      const parsedRows = evolvingBlock.rows
        .map((row) => ({
          time: row[timeIndex],
          pressure: row[pressureIndex],
          temperature: row[temperatureIndex],
          row,
        }))
        .filter(({ time, pressure, temperature }) => Number.isFinite(time) && Number.isFinite(pressure) && Number.isFinite(temperature))
        .sort((a, b) => a.time - b.time)
      if (parsedRows.length > 0) {
        const additionalHeaders = evolvingBlock.headers.filter((header) => header !== 'time.s' && header !== 'ENV.pressure.Pa' && header !== 'ENV.temperature.K')
        const additionalSeries = Object.fromEntries(
          additionalHeaders.map((header) => [
            header,
            parsedRows.map(({ row }) => {
              const valueIndex = evolvingBlock.headers.indexOf(header)
              return row[valueIndex]
            }),
          ])
        )
        evolvingHydrated = {
          enabled: true,
          times: parsedRows.map((row) => row.time),
          pressure: parsedRows.map((row) => row.pressure),
          temperature: parsedRows.map((row) => row.temperature),
          additionalSeries,
        }
      }
    }
  }
  return evolvingHydrated
}
