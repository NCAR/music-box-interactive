import { useMemo, useState } from 'react'
import {
  ConcentrationUnitContext,
  DEFAULT_CONCENTRATION_UNIT_ID,
} from './concentrationUnitContext'

// Shares one concentration unit across the Results tabs (Species, Reaction Rates, Flow Diagram).
export function ConcentrationUnitProvider({ children }) {
  const [unitId, setUnitId] = useState(DEFAULT_CONCENTRATION_UNIT_ID)
  const value = useMemo(() => [unitId, setUnitId], [unitId])
  return (
    <ConcentrationUnitContext.Provider value={value}>{children}</ConcentrationUnitContext.Provider>
  )
}
