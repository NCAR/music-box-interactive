import { describe, it, expect, vi } from 'vitest'
import { buildConditionsManager } from '../src/services/simulation/local/conditions'
import { airDensityAtTime } from '../src/utils/environmentSeries'
import { airDensityMolM3 } from '../src/utils/concentrationUnits'

const state = (evolving, initial = { temperature: 280, pressure: 90000 }) => ({
  conditions: {},
  initial: { ...initial, concentrations: {} },
  rateConstants: {},
  evolving: { enabled: true, additionalSeries: {}, ...evolving },
})

describe('air density for the Conditions tab follows the solver', () => {
  it('uses the initial temperature and pressure, not fixed defaults, for unset rows', () => {
    const mgr = buildConditionsManager(
      state({ times: [0, 100], temperature: [null, null], pressure: [null, null] })
    )
    expect(airDensityAtTime(mgr, 100)).toBeCloseTo(airDensityMolM3(90000, 280), 10)
  })

  it("uses a row's own values once set", () => {
    const mgr = buildConditionsManager(
      state({ times: [0, 100], temperature: [300, 310], pressure: [100000, 95000] })
    )
    expect(airDensityAtTime(mgr, 0)).toBeCloseTo(airDensityMolM3(100000, 300), 10)
    expect(airDensityAtTime(mgr, 100)).toBeCloseTo(airDensityMolM3(95000, 310), 10)
  })

  it('holds a provided density for later rows, as the solver does', () => {
    const mgr = buildConditionsManager(
      state({
        times: [0, 100],
        temperature: [300, 310],
        pressure: [100000, 95000],
        additionalSeries: { 'ENV.air number density.mol m-3': [55, 55] },
      })
    )
    expect(airDensityAtTime(mgr, 0)).toBe(55)
    expect(airDensityAtTime(mgr, 100)).toBe(55)
  })

  it('never returns a non-positive density', () => {
    const mgr = buildConditionsManager(
      state({
        times: [0, 100],
        temperature: [300, 310],
        pressure: [100000, 95000],
        additionalSeries: { 'ENV.air number density.mol m-3': [55, null] },
      })
    )
    expect(airDensityAtTime(mgr, 100)).toBeGreaterThan(0)
  })
})

describe('initial temperature and pressure at time 0', () => {
  const at0 = (mgr) => mgr.getConditionsAtTime(0)

  it('does not add them on top of a time-0 evolving row, so the solver never warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mgr = buildConditionsManager(
      state({ times: [0, 100], temperature: [300, 310], pressure: [100000, 95000] })
    )
    expect(warn).not.toHaveBeenCalled()
    expect(at0(mgr).temperature).toBe(300)
    expect(at0(mgr).pressure).toBe(100000)
    warn.mockRestore()
  })

  it('still falls back to the initial values for an unset time-0 cell', () => {
    const mgr = buildConditionsManager(
      state({ times: [0, 100], temperature: [null, 310], pressure: [null, 95000] })
    )
    expect(at0(mgr).temperature).toBe(280)
    expect(at0(mgr).pressure).toBe(90000)
  })

  it('still uses them when evolving conditions are off, as their only source', () => {
    const mgr = buildConditionsManager(
      state({ enabled: false, times: [], temperature: [], pressure: [] })
    )
    expect(at0(mgr).temperature).toBe(280)
    expect(at0(mgr).pressure).toBe(90000)
  })

  it('still uses them when the evolving table has no series for that field', () => {
    const mgr = buildConditionsManager(state({ times: [0, 100], temperature: [], pressure: [] }))
    expect(at0(mgr).temperature).toBe(280)
    expect(at0(mgr).pressure).toBe(90000)
  })
})
