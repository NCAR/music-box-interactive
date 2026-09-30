import { ConditionsManager } from '@ncar/music-box'
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

const filterFinite = (obj) =>
  Object.fromEntries(Object.entries(obj || {}).filter(([, value]) => isFiniteNumber(value)))

// Mirrors @ncar/music-box's ConditionsManager rate-parameter prefixes -- this is the wire
// format's documented column convention, not solver logic, so it's safe to know here too.
const RATE_PARAM_PREFIXES = new Set(['PHOTO', 'EMIS', 'LOSS', 'USER', 'SURF'])
const AIR_DENSITY_HEADER = 'ENV.air number density.mol m-3'

// additionalSeries is keyed by raw header (whatever an uploaded config's evolving block
// declared), not by field type, so a header has to be classified by its prefix the same way
// ConditionsManager itself would when parsing it back. Usually PHOTO/EMIS/LOSS/USER/SURF, but
// an unusual upload could have CONC.* or air density evolve too.
const classifySeriesHeader = (header) => {
  if (header === AIR_DENSITY_HEADER) return { kind: 'airDensity' }
  const prefix = header.split('.')[0]
  if (prefix === 'CONC') return { kind: 'concentration', species: header.split('.')[1] }
  if (RATE_PARAM_PREFIXES.has(prefix)) return { kind: 'rateParameter' }
  return { kind: 'unknown' }
}

// Builds the ConditionsManager for the conditions in Redux, one setCondition() call per moment,
// so a downloaded or run config always matches what MusicBox understands.
//
// Anything that needs the conditions in effect at a time (e.g. the air density) should ask
// this manager via getConditionsAtTime(t).
export const buildConditionsManager = (conditions) => {
  const source = conditions.conditions || {}

  const reduxInitial = conditions.initial || {}
  const sourceInitial = source.initial || {}
  const temperature0 = reduxInitial.temperature ?? sourceInitial.temperature ?? DEFAULT_TEMPERATURE_K
  const pressure0 = reduxInitial.pressure ?? sourceInitial.pressure ?? DEFAULT_PRESSURE_PA

  const evolvingFromUi = conditions.evolving || {}
  const uiHasEvolvingState =
    evolvingFromUi.enabled === true ||
    (Array.isArray(evolvingFromUi.times) && evolvingFromUi.times.length > 0) ||
    (Array.isArray(evolvingFromUi.temperature) && evolvingFromUi.temperature.length > 0) ||
    (Array.isArray(evolvingFromUi.pressure) && evolvingFromUi.pressure.length > 0) ||
    Object.keys(evolvingFromUi.additionalSeries || {}).length > 0
  const evolving = uiHasEvolvingState ? evolvingFromUi : source.evolving || {}
  const additionalSeries = evolving.additionalSeries || {}
  const hasTemperatureSeries = Array.isArray(evolving.temperature) && evolving.temperature.length > 0
  const hasPressureSeries = Array.isArray(evolving.pressure) && evolving.pressure.length > 0

  // A null (or missing) value at t=0 leaves initial.concentrations / rateConstants) in place.
  const zeroIndex = Array.isArray(evolving.times) ? evolving.times.indexOf(0) : -1
  const headersOverriddenAtZero = (kind) =>
    evolving.enabled && zeroIndex !== -1
      ? new Set(
          Object.entries(additionalSeries).flatMap(([header, series]) => {
            if (!Array.isArray(series) || series[zeroIndex] == null) return []
            return classifySeriesHeader(header).kind === kind ? [header] : []
          })
        )
      : new Set()

  const speciesOverriddenAtZero = new Set(
    [...headersOverriddenAtZero('concentration')].map(
      (header) => classifySeriesHeader(header).species
    )
  )
  const initialConcentrations = Object.fromEntries(
    Object.entries(filterFinite(reduxInitial.concentrations)).filter(
      ([species]) => !speciesOverriddenAtZero.has(species)
    )
  )

  const rateParametersOverriddenAtZero = headersOverriddenAtZero('rateParameter')
  const initialRateParameters = Object.fromEntries(
    Object.entries(filterFinite(conditions.rateConstants)).filter(
      ([header]) => !rateParametersOverriddenAtZero.has(header)
    )
  )

  const mgr = new ConditionsManager([])

  const evolvingSetsAtZero = evolving.enabled && zeroIndex !== -1
  mgr.setCondition(0, {
    ...(evolvingSetsAtZero && hasTemperatureSeries ? {} : { temperature: temperature0 }),
    ...(evolvingSetsAtZero && hasPressureSeries ? {} : { pressure: pressure0 }),
    concentrations: initialConcentrations,
    rateParameters: initialRateParameters,
  })

  if (evolving.enabled && Array.isArray(evolving.times) && evolving.times.length > 0) {
    evolving.times.forEach((time, index) => {
      if (!isFiniteNumber(time)) return

      const moment = { concentrations: {}, rateParameters: {} }
      if (hasTemperatureSeries) {
        moment.temperature = evolving.temperature[index] ?? temperature0
      }
      if (hasPressureSeries) {
        moment.pressure = evolving.pressure[index] ?? pressure0
      }

      Object.entries(additionalSeries).forEach(([header, series]) => {
        if (!Array.isArray(series) || series.length === 0) return
        const raw = series[index]
        const classified = classifySeriesHeader(header)

        // A concentration or rate-parameter event only fires where a value is actually set
        if (classified.kind === 'concentration') {
          if (raw != null) moment.concentrations[classified.species] = raw
          return
        }
        if (classified.kind === 'rateParameter') {
          if (raw != null) moment.rateParameters[header] = raw
          return
        }

        const value = raw == null ? 0 : raw
        if (classified.kind === 'airDensity') {
          moment.airDensity = value
        }
        // 'unknown' headers would be silently dropped by ConditionsManager when solving
        // anyway, so there's nothing useful to do with one here.
      })

      mgr.setCondition(time, moment)
    })
  }


  return mgr
}

// Builds the solver's conditions block from the same manager (see buildConditionsManager).
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

  const mgr = buildConditionsManager(conditions)

  return {
    ...sourceWithoutFilepaths,
    ...mgr.toDataBlocks(),
  }
}
