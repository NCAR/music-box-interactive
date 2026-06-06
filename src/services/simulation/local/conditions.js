import { DEFAULT_PRESSURE_PA, DEFAULT_TEMPERATURE_K } from './constants'

const hasUiConditionState = (conditions) => {
  const evolving = conditions?.evolving || {}

  return (
    Object.keys(conditions?.initial?.concentrations || {}).length > 0 ||
    Object.keys(conditions?.rateConstants || {}).length > 0 ||
    evolving.enabled === true ||
    (Array.isArray(evolving.times) && evolving.times.length > 0) ||
    (Array.isArray(evolving.temperature) && evolving.temperature.length > 0) ||
    (Array.isArray(evolving.pressure) && evolving.pressure.length > 0) ||
    Object.keys(evolving.additionalSeries || {}).length > 0
  )
}

const hasHydratedUiState = (conditions) => {
  return Boolean(
    conditions?.hydration?.initialExampleId || conditions?.hydration?.evolvingExampleId
  )
}

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

export const buildSolverConditions = (conditions) => {
  const source = conditions.conditions || {}
  const sourceWithoutFilepaths = { ...source }
  delete sourceWithoutFilepaths.filepaths

  const sourceHasInlineData = Array.isArray(source.data) && source.data.length > 0
  const uiHasState = hasUiConditionState(conditions)
  const uiHydrated = hasHydratedUiState(conditions)

  // For untouched source-only payloads (e.g. uploaded configs), keep authored data.
  // Once UI state is hydrated/edited, rebuild from Redux so removals are reflected.
  if (sourceHasInlineData && !uiHasState && !uiHydrated) {
    return {
      ...sourceWithoutFilepaths,
      data: source.data,
    }
  }

  const reduxInitial = conditions.initial || {}
  const sourceInitial = source.initial || {}
  const initial = {
    temperature: reduxInitial.temperature ?? sourceInitial.temperature ?? DEFAULT_TEMPERATURE_K,
    pressure: reduxInitial.pressure ?? sourceInitial.pressure ?? DEFAULT_PRESSURE_PA,
    concentrations: { ...(reduxInitial.concentrations || {}) },
  }

  const rateConstants = { ...(conditions.rateConstants || {}) }

  const evolvingFromUi = conditions.evolving || {}
  const uiHasEvolvingState =
    evolvingFromUi.enabled === true ||
    (Array.isArray(evolvingFromUi.times) && evolvingFromUi.times.length > 0) ||
    (Array.isArray(evolvingFromUi.temperature) && evolvingFromUi.temperature.length > 0) ||
    (Array.isArray(evolvingFromUi.pressure) && evolvingFromUi.pressure.length > 0) ||
    Object.keys(evolvingFromUi.additionalSeries || {}).length > 0
  const evolving = uiHasEvolvingState ? evolvingFromUi : source.evolving || {}
  const additionalSeries = evolving.additionalSeries || {}
  const dataBlocks = []

  const initialHeaders = ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa']
  const initialRow = [0, initial.temperature, initial.pressure]

  Object.entries(initial.concentrations || {}).forEach(([species, value]) => {
    if (isFiniteNumber(value)) {
      initialHeaders.push(`CONC.${species}.mol m-3`)
      initialRow.push(value)
    }
  })

  Object.entries(rateConstants).forEach(([name, value]) => {
    if (isFiniteNumber(value)) {
      initialHeaders.push(name)
      initialRow.push(value)
    }
  })

  dataBlocks.push({
    headers: initialHeaders,
    rows: [initialRow],
  })

  if (evolving.enabled && Array.isArray(evolving.times) && evolving.times.length > 0) {
    const validTimeIndices = evolving.times
      .map((time, index) => ({ time, index }))
      .filter(({ time }) => isFiniteNumber(time))

    if (validTimeIndices.length === 0) {
      return {
        ...sourceWithoutFilepaths,
        data: dataBlocks,
      }
    }

    const evolvingHeaders = ['time.s']

    if (Array.isArray(evolving.temperature) && evolving.temperature.length > 0) {
      evolvingHeaders.push('ENV.temperature.K')
    }

    if (Array.isArray(evolving.pressure) && evolving.pressure.length > 0) {
      evolvingHeaders.push('ENV.pressure.Pa')
    }

    const additionalHeaders = Object.keys(additionalSeries).filter((key) => {
      const series = additionalSeries[key]
      return Array.isArray(series) && series.length > 0
    })

    evolvingHeaders.push(...additionalHeaders)

    const evolvingRows = validTimeIndices.map(({ time, index }) => {
      return evolvingHeaders.map((header) => {
        if (header === 'time.s') {
          return time
        }
        if (header === 'ENV.temperature.K') {
          return evolving.temperature?.[index] ?? initial.temperature
        }
        if (header === 'ENV.pressure.Pa') {
          return evolving.pressure?.[index] ?? initial.pressure
        }

        if (Object.prototype.hasOwnProperty.call(additionalSeries, header)) {
          const value = additionalSeries[header]?.[index]
          return value == null ? 0 : value
        }

        return 0
      })
    })

    dataBlocks.push({
      headers: evolvingHeaders,
      rows: evolvingRows,
    })
  }

  return {
    ...sourceWithoutFilepaths,
    data: dataBlocks,
  }
}
