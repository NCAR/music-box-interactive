import { createContext, useContext, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { buildEnvironmentSeries } from '../utils/environmentSeries'

const DEFAULT_UNIT_ID = 'mol_m3'

const ConcentrationUnitContext = createContext(null)

// Shares one concentration unit across the Results tabs (Species, Reaction Rates, Flow Diagram).
export function ConcentrationUnitProvider({ children }) {
  const [unitId, setUnitId] = useState(DEFAULT_UNIT_ID)
  const value = useMemo(() => [unitId, setUnitId], [unitId])
  return (
    <ConcentrationUnitContext.Provider value={value}>{children}</ConcentrationUnitContext.Provider>
  )
}

// Falls back to local state outside a provider, so a plot still works standalone.
export function useConcentrationUnit() {
  const shared = useContext(ConcentrationUnitContext)
  const local = useState(DEFAULT_UNIT_ID)
  return shared ?? local
}

// Temperature and pressure at each of the given results' times, for air-density conversion.
export function useEnvironmentSeries(results) {
  const conditions = useSelector((state) => state.conditions)
  return useMemo(() => buildEnvironmentSeries(conditions, results), [conditions, results])
}
