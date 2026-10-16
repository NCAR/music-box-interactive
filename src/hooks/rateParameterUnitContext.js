import { createContext, useContext } from 'react'
import {
  DEFAULT_RATE_UNIT,
  RATE_UNIT_PARAMETERS,
  RATE_UNIT_SYSTEMS,
} from '../utils/rateParameterUnits'

// The display unit of each rate parameter, by reaction type: { ARRHENIUS: { A: 'molecule' } }.
// The choice is saved in localStorage. Without storage, the app uses the defaults.
export const RATE_UNIT_STORAGE_KEY = 'musicbox.rateParameterUnits'

const UNIT_IDS = RATE_UNIT_SYSTEMS.map((unit) => unit.id)

// Every parameter with the same unit.
export const allRateUnits = (unitId) =>
  Object.fromEntries(
    Object.entries(RATE_UNIT_PARAMETERS).map(([type, parameters]) => [
      type,
      Object.fromEntries(Object.keys(parameters).map((key) => [key, unitId])),
    ])
  )

export const DEFAULT_RATE_UNITS = allRateUnits(DEFAULT_RATE_UNIT)

// The saved choice on top of the defaults. A saved value that is not a known unit is ignored.
export function readRateUnits() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(RATE_UNIT_STORAGE_KEY) ?? '{}')
    return Object.fromEntries(
      Object.entries(DEFAULT_RATE_UNITS).map(([type, parameters]) => [
        type,
        Object.fromEntries(
          Object.entries(parameters).map(([key, unitId]) => {
            const savedId = saved?.[type]?.[key]
            return [key, UNIT_IDS.includes(savedId) ? savedId : unitId]
          })
        ),
      ])
    )
  } catch {
    return DEFAULT_RATE_UNITS
  }
}

export function saveRateUnits(units) {
  try {
    window.localStorage.setItem(RATE_UNIT_STORAGE_KEY, JSON.stringify(units))
  } catch {
    // Storage can be blocked (private windows). The choice then lasts for this page only.
  }
}

// { units, unitFor(type, key), setUnit(type, key, unitId), setAllUnits(unitId), resetUnits() }
export const RateParameterUnitContext = createContext({
  units: DEFAULT_RATE_UNITS,
  unitFor: (type, key) => DEFAULT_RATE_UNITS[type]?.[key] ?? null,
  setUnit: () => {},
  setAllUnits: () => {},
  resetUnits: () => {},
})

export const useRateParameterUnits = () => useContext(RateParameterUnitContext)
