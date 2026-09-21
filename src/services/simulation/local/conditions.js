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

// Builds the real music-box v1 conditions, one setCondition() call per moment, so a downloaded
// or run config always matches what MusicBox itself understands. time.s = 0 isn't special to
// MusicBox -- it's just whatever's set at the earliest time -- so it's built the same way as
// every other moment, not as a separate "initial conditions" case.
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
  const temperature0 = reduxInitial.temperature ?? sourceInitial.temperature ?? DEFAULT_TEMPERATURE_K
  const pressure0 = reduxInitial.pressure ?? sourceInitial.pressure ?? DEFAULT_PRESSURE_PA

  const mgr = new ConditionsManager([])

  mgr.setCondition(0, {
    temperature: temperature0,
    pressure: pressure0,
    concentrations: filterFinite(reduxInitial.concentrations),
    rateParameters: filterFinite(conditions.rateConstants),
  })

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
        const value = raw == null ? 0 : raw

        const classified = classifySeriesHeader(header)
        if (classified.kind === 'airDensity') {
          moment.airDensity = value
        } else if (classified.kind === 'concentration') {
          moment.concentrations[classified.species] = value
        } else if (classified.kind === 'rateParameter') {
          moment.rateParameters[header] = value
        }
        // 'unknown' headers would be silently dropped by ConditionsManager when solving
        // anyway, so there's nothing useful to do with one here.
      })

      mgr.setCondition(time, moment)
    })
  }

  return {
    ...sourceWithoutFilepaths,
    ...mgr.toDataBlocks(),
  }
}
