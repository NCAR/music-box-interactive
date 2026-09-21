import { describe, it, expect } from 'vitest'
import { ConditionsManager, parseConditions } from '@ncar/music-box'

import { buildSolverConditions } from '../src/services/simulation/local/conditions'

// Re-parses the {data: [...]} blocks buildSolverConditions returns back into a
// ConditionsManager, the same way MusicBox itself would, so assertions can read resolved
// values instead of digging through raw headers/rows.
const reload = (result) => new ConditionsManager(parseConditions(result))

describe('buildSolverConditions', () => {
  it('keeps authored source data untouched when the UI has no state', () => {
    const source = {
      data: [{ headers: ['time.s', 'ENV.temperature.K'], rows: [[0, 250]] }],
    }
    const result = buildSolverConditions({ conditions: source })
    expect(result.data).toBe(source.data)
  })

  it('builds a single moment at time 0 from initial conditions', () => {
    const result = buildSolverConditions({
      initial: { temperature: 250, pressure: 90000, concentrations: { A: 1.5 } },
      rateConstants: { 'PHOTO.photo1.s-1': 1.0e-4 },
      evolving: { enabled: false, times: [], temperature: [], pressure: [], additionalSeries: {} },
      conditions: {},
    })

    const mgr = reload(result)
    expect(mgr.getTimes()).toEqual([0])
    const conds = mgr.getConditionsAtTime(0)
    expect(conds.temperature).toBe(250)
    expect(conds.pressure).toBe(90000)
    expect(conds.rateParams['PHOTO.photo1']).toBe(1.0e-4)
    expect(mgr.concentrationEvents[0]['A']).toBe(1.5)
  })

  it('skips non-finite concentrations and rate constants', () => {
    const result = buildSolverConditions({
      initial: { temperature: 298.15, pressure: 101325, concentrations: { A: NaN, B: 2 } },
      rateConstants: { 'PHOTO.photo1.s-1': undefined, 'PHOTO.photo2.s-1': 3 },
      evolving: {},
      conditions: {},
    })

    const mgr = reload(result)
    expect(mgr.concentrationEvents[0]).toEqual({ B: 2 })
    expect(mgr.getConditionsAtTime(0).rateParams).toEqual({ 'PHOTO.photo2': 3 })
  })

  it('builds one moment per evolving time, with temperature/pressure interpolating', () => {
    const result = buildSolverConditions({
      initial: { temperature: 298.15, pressure: 101325, concentrations: {} },
      rateConstants: {},
      evolving: {
        enabled: true,
        times: [0, 30, 60],
        temperature: [298.15, 300, 305],
        pressure: [101325, 101000, 100500],
        additionalSeries: {},
      },
      conditions: {},
    })

    const mgr = reload(result)
    expect(mgr.getTimes()).toEqual([0, 30, 60])
    expect(mgr.getConditionsAtTime(30).temperature).toBe(300)
    expect(mgr.getConditionsAtTime(60).pressure).toBe(100500)
    // Step interpolation: still 305/100500 after the last configured point.
    expect(mgr.getConditionsAtTime(999).temperature).toBe(305)
  })

  it('routes a PHOTO/EMIS additionalSeries header to rate parameters', () => {
    const result = buildSolverConditions({
      initial: { temperature: 298.15, pressure: 101325, concentrations: {} },
      rateConstants: {},
      evolving: {
        enabled: true,
        times: [0, 30],
        temperature: [],
        pressure: [],
        additionalSeries: { 'PHOTO.photo1.s-1': [1.0e-4, 2.0e-4] },
      },
      conditions: {},
    })

    const mgr = reload(result)
    expect(mgr.getConditionsAtTime(0).rateParams['PHOTO.photo1']).toBe(1.0e-4)
    expect(mgr.getConditionsAtTime(30).rateParams['PHOTO.photo1']).toBe(2.0e-4)
  })

  // Redundant with hydrateConditions.js's filtering today, but additionalSeries is just
  // "raw header -> array" with no structural guarantee it only holds rate parameters -- this
  // must not throw, and must land as a concentration event rather than a rate parameter.
  it('routes a CONC.* additionalSeries header to concentrations instead of throwing', () => {
    const result = buildSolverConditions({
      initial: { temperature: 298.15, pressure: 101325, concentrations: {} },
      rateConstants: {},
      evolving: {
        enabled: true,
        times: [0, 30],
        temperature: [],
        pressure: [],
        additionalSeries: { 'CONC.A.mol m-3': [1.0, 0.5] },
      },
      conditions: {},
    })

    const mgr = reload(result)
    expect(mgr.concentrationEvents[0]['A']).toBe(1.0)
    expect(mgr.concentrationEvents[30]['A']).toBe(0.5)
  })

  // Same reasoning as the CONC.* case above.
  it('routes an ENV.air number density.mol m-3 additionalSeries header to air density', () => {
    const result = buildSolverConditions({
      initial: { temperature: 298.15, pressure: 101325, concentrations: {} },
      rateConstants: {},
      evolving: {
        enabled: true,
        times: [0, 30],
        temperature: [],
        pressure: [],
        additionalSeries: { 'ENV.air number density.mol m-3': [40, 41] },
      },
      conditions: {},
    })

    const mgr = reload(result)
    expect(mgr.getConditionsAtTime(0).airDensity).toBe(40)
    expect(mgr.getConditionsAtTime(30).airDensity).toBe(41)
  })

  it('defaults a null/missing additionalSeries entry to 0 rather than omitting it', () => {
    const result = buildSolverConditions({
      initial: { temperature: 298.15, pressure: 101325, concentrations: {} },
      rateConstants: {},
      evolving: {
        enabled: true,
        times: [0, 30],
        temperature: [],
        pressure: [],
        additionalSeries: { 'PHOTO.photo1.s-1': [1.0e-4, null] },
      },
      conditions: {},
    })

    const mgr = reload(result)
    expect(mgr.getConditionsAtTime(30).rateParams['PHOTO.photo1']).toBe(0)
  })

  it('leaves ENV.temperature.K unset at evolving times when no temperature series is given', () => {
    const result = buildSolverConditions({
      initial: { temperature: 250, pressure: 101325, concentrations: {} },
      rateConstants: {},
      evolving: {
        enabled: true,
        times: [0, 30],
        temperature: [],
        pressure: [],
        additionalSeries: { 'PHOTO.photo1.s-1': [1.0e-4, 2.0e-4] },
      },
      conditions: {},
    })

    const mgr = reload(result)
    // Carried forward from time 0 via step interpolation, not re-set at time 30.
    expect(mgr.getConditionsAtTime(30).temperature).toBe(250)
    expect(mgr.timePoints.find((p) => p.t === 30).temp).toBeNull()
  })
})
