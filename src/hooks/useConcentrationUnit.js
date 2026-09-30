import { useContext, useMemo, useState } from 'react'
import { airDensitiesFromResults } from '../utils/environmentSeries'
import { CONCENTRATION_UNITS, isMixingRatioUnit } from '../utils/concentrationUnits'
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

const NO_DENSITY_REASON = 'The simulation did not report air density'

// The shared unit choice applied to one set of results. Mixing-ratio units need the solver's
// air density; without it they are listed but disabled, and the unit falls back to mol m-3.
export function useResultsConcentrationUnit(results) {
  const [selectedId, setUnitId] = useConcentrationUnit()
  const airDensities = useMemo(() => airDensitiesFromResults(results), [results])

  const units = useMemo(
    () =>
      CONCENTRATION_UNITS.map((unit) =>
        isMixingRatioUnit(unit.id) && !airDensities
          ? { ...unit, disabled: true, disabledReason: NO_DENSITY_REASON }
          : unit
      ),
    [airDensities]
  )

  const unit = units.find((u) => u.id === selectedId && !u.disabled) ?? units[0]
  return { unitId: unit.id, unit, units, setUnitId, airDensities }
}
