import { describe, it, expect } from 'vitest'
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
