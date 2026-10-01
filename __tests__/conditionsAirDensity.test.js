import { describe, it, expect, vi } from 'vitest'
import { buildConditionsManager } from '../src/services/simulation/local/conditions'
import { airDensityAtTime } from '../src/utils/environmentSeries'
import { airDensityMolM3 } from '../src/utils/concentrationUnits'

const state = (times, columns) => ({ table: { times, columns } })

describe('air density for the Conditions tab follows the solver', () => {
  it('holds the earlier temperature and pressure for unset rows', () => {
    const mgr = buildConditionsManager(
      state([0, 100], { 'ENV.temperature.K': [280, null], 'ENV.pressure.Pa': [90000, null] })
    )
    expect(airDensityAtTime(mgr, 100)).toBeCloseTo(airDensityMolM3(90000, 280), 10)
  })

  it("uses a row's own values once set", () => {
    const mgr = buildConditionsManager(
      state([0, 100], { 'ENV.temperature.K': [300, 310], 'ENV.pressure.Pa': [100000, 95000] })
    )
    expect(airDensityAtTime(mgr, 0)).toBeCloseTo(airDensityMolM3(100000, 300), 10)
    expect(airDensityAtTime(mgr, 100)).toBeCloseTo(airDensityMolM3(95000, 310), 10)
  })

  it('holds a provided density for later rows, as the solver does', () => {
    const mgr = buildConditionsManager(
      state([0, 100], {
        'ENV.temperature.K': [300, 310],
        'ENV.pressure.Pa': [100000, 95000],
        'ENV.air number density.mol m-3': [55, null],
      })
    )
    expect(airDensityAtTime(mgr, 0)).toBe(55)
    expect(airDensityAtTime(mgr, 100)).toBe(55)
  })

  it('never returns a non-positive density', () => {
    const mgr = buildConditionsManager(
      state([0, 100], {
        'ENV.temperature.K': [300, 310],
        'ENV.pressure.Pa': [100000, 95000],
        'ENV.air number density.mol m-3': [0, null],
      })
    )
    expect(airDensityAtTime(mgr, 100)).toBeGreaterThan(0)
  })
})

describe('temperature and pressure at time 0', () => {
  const at0 = (mgr) => mgr.getConditionsAtTime(0)

  it('sets each value once, so the solver never warns about a duplicate', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mgr = buildConditionsManager(
      state([0, 100], { 'ENV.temperature.K': [300, 310], 'ENV.pressure.Pa': [100000, 95000] })
    )
    expect(warn).not.toHaveBeenCalled()
    expect(at0(mgr).temperature).toBe(300)
    expect(at0(mgr).pressure).toBe(100000)
    warn.mockRestore()
  })

  it('falls back to the defaults for an unset time-0 cell', () => {
    const mgr = buildConditionsManager(
      state([0, 100], { 'ENV.temperature.K': [null, 310], 'ENV.pressure.Pa': [null, 95000] })
    )
    expect(at0(mgr).temperature).toBe(298.15)
    expect(at0(mgr).pressure).toBe(101325)
  })

  it('falls back to the defaults for a table without a time-0 row', () => {
    const mgr = buildConditionsManager(state([100], { 'ENV.temperature.K': [310] }))
    expect(at0(mgr).temperature).toBe(298.15)
    expect(at0(mgr).pressure).toBe(101325)
  })
})
