import { useContext, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
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

// Temperature and pressure at each of the given results' times, for air-density conversion.
export function useEnvironmentSeries(results) {
  const conditions = useSelector((state) => state.conditions)
  return useMemo(() => buildEnvironmentSeries(conditions, results), [conditions, results])
}
