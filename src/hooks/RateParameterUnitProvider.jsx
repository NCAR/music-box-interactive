import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_RATE_UNITS,
  RateParameterUnitContext,
  allRateUnits,
  readRateUnits,
  saveRateUnits,
} from './rateParameterUnitContext'

// Holds the display unit of each rate parameter and saves the choice.
export function RateParameterUnitProvider({ children }) {
  const [units, setUnits] = useState(readRateUnits)

  useEffect(() => {
    saveRateUnits(units)
  }, [units])

  const value = useMemo(
    () => ({
      units,
      unitFor: (type, key) => units[type]?.[key] ?? null,
      setUnit: (type, key, unitId) =>
        setUnits((current) => ({ ...current, [type]: { ...current[type], [key]: unitId } })),
      setAllUnits: (unitId) => setUnits(allRateUnits(unitId)),
      resetUnits: () => setUnits(DEFAULT_RATE_UNITS),
    }),
    [units]
  )

  return (
    <RateParameterUnitContext.Provider value={value}>{children}</RateParameterUnitContext.Provider>
  )
}

export default RateParameterUnitProvider
