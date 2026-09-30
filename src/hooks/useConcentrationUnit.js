import { useContext, useMemo, useState } from 'react'
import { buildEnvironmentSeries } from '../utils/environmentSeries'
import {
  ConcentrationUnitContext,
  DEFAULT_CONCENTRATION_UNIT_ID,
} from './concentrationUnitContext'

// Falls back to local state outside a provider, so a plot still works standalone.
export function useConcentrationUnit() {
  const shared = useContext(ConcentrationUnitContext)
  const local = useState(DEFAULT_CONCENTRATION_UNIT_ID)
  return shared ?? local
}

// Solver-reported temperature, pressure and air density at each result time
export function useEnvironmentSeries(results) {
  return useMemo(() => buildEnvironmentSeries(results), [results])
}
