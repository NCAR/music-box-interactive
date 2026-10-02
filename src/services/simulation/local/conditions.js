import { ConditionsManager } from '@ncar/music-box'
import {
  DEFAULT_PRESSURE,
  DEFAULT_TEMPERATURE,
  DENSITY_HEADER,
  PRESSURE_HEADER,
  TEMPERATURE_HEADER,
  emptyTable,
} from '../../conditions/table'
import { headerForRateColumn, parseRateColumnKey } from '../../conditions/rateColumns'
import { rateReactionNames } from './reactionNames'

// Mirrors @ncar/music-box's ConditionsManager rate-parameter prefixes -- this is the wire
// format's documented column convention, not solver logic, so it's safe to know here too.
const RATE_PARAM_PREFIXES = new Set(['PHOTO', 'EMIS', 'LOSS', 'USER', 'SURF'])

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

// Builds the ConditionsManager for the conditions table in Redux, one setCondition() call per
// time, so a downloaded or run config always matches what MusicBox understands. An unset cell
// sets nothing, so the solver holds the earlier value. Time 0 always gets a temperature and a
// pressure: the table value, or the default.
//
// A rate-parameter column is stored under its reaction id (see rateColumns). `reactions` gives
// the header for it; a column whose reaction is not in `reactions` is left out.
//
// Anything that needs the conditions in effect at a time (e.g. the air density) should ask
// this manager via getConditionsAtTime(t).
export const buildConditionsManager = (conditions, reactions = []) => {
  const table = conditions?.table || emptyTable()
  const names = rateReactionNames(reactions)
  const mgr = new ConditionsManager([])
  const zeroIndex = table.times.indexOf(0)

  if (zeroIndex === -1) {
    mgr.setCondition(0, { temperature: DEFAULT_TEMPERATURE, pressure: DEFAULT_PRESSURE })
  }

  table.times.forEach((time, index) => {
    if (!isFiniteNumber(time)) return
    const moment = { concentrations: {}, rateParameters: {} }

    Object.entries(table.columns).forEach(([key, values]) => {
      const value = Array.isArray(values) ? values[index] : null
      if (!isFiniteNumber(value)) return
      const header = parseRateColumnKey(key) ? headerForRateColumn(key, names) : key
      if (!header) return

      if (header === TEMPERATURE_HEADER) moment.temperature = value
      else if (header === PRESSURE_HEADER) moment.pressure = value
      else if (header === DENSITY_HEADER) moment.airDensity = value
      else if (header.startsWith('CONC.')) moment.concentrations[header.split('.')[1]] = value
      else if (RATE_PARAM_PREFIXES.has(header.split('.')[0])) moment.rateParameters[header] = value
      // Other headers would be silently dropped by ConditionsManager when solving anyway.
    })

    if (time === 0) {
      moment.temperature ??= DEFAULT_TEMPERATURE
      moment.pressure ??= DEFAULT_PRESSURE
    }

    mgr.setCondition(time, moment)
  })

  return mgr
}

// Builds the solver's conditions block from the same manager (see buildConditionsManager).
export const buildSolverConditions = (conditions, reactions = []) =>
  buildConditionsManager(conditions, reactions).toDataBlocks()
