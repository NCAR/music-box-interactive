import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { ConcentrationUnitProvider } from '../src/hooks/ConcentrationUnitProvider'
import { useResultsConcentrationUnit } from '../src/hooks/useConcentrationUnit'

const withDensity = [
  { time: 0, concentrations: {}, environment: { airDensity: 40 } },
  { time: 1, concentrations: {}, environment: { airDensity: 41 } },
]
const withoutDensity = [{ time: 0, concentrations: {}, environment: { airDensity: null } }]

const wrapper = ({ children }) => <ConcentrationUnitProvider>{children}</ConcentrationUnitProvider>

describe('useResultsConcentrationUnit', () => {
  it('offers every unit when the solver reported air density', () => {
    const { result } = renderHook(() => useResultsConcentrationUnit(withDensity), { wrapper })
    expect(result.current.units.every((u) => !u.disabled)).toBe(true)

    act(() => result.current.setUnitId('ppb'))
    expect(result.current.unitId).toBe('ppb')
    expect(result.current.airDensities).toEqual([40, 41])
  })

  it('disables mixing-ratio units and falls back to mol m-3 without air density', () => {
    const { result, rerender } = renderHook(
      ({ results }) => useResultsConcentrationUnit(results),
      { wrapper, initialProps: { results: withDensity } }
    )
    act(() => result.current.setUnitId('ppb'))
    expect(result.current.unitId).toBe('ppb')

    rerender({ results: withoutDensity })
    expect(result.current.unitId).toBe('mol_m3')
    expect(result.current.airDensities).toBeNull()
    expect(result.current.units.filter((u) => u.disabled).map((u) => u.id)).toEqual([
      'mol_mol',
      'ppth',
      'ppm',
      'ppb',
      'ppt',
    ])
    expect(result.current.units[0].disabled).toBeUndefined()
  })
})
