import { describe, it, expect } from 'vitest'
import { ConditionsManager, parseConditions } from '@ncar/music-box'

import { buildSolverConditions } from '../src/services/simulation/local/conditions'

// Re-parses the {data: [...]} blocks buildSolverConditions returns back into a
// ConditionsManager, the same way MusicBox itself would, so assertions can read resolved
// values instead of digging through raw headers/rows.
const reload = (result) => new ConditionsManager(parseConditions(result))

const solve = (times, columns) => reload(buildSolverConditions({ table: { times, columns } }))

describe('buildSolverConditions', () => {
  it('uses the default temperature and pressure at time 0 for an empty table', () => {
    const mgr = solve([], {})
    expect(mgr.getTimes()).toEqual([0])
    expect(mgr.getConditionsAtTime(0).temperature).toBe(298.15)
    expect(mgr.getConditionsAtTime(0).pressure).toBe(101325)
  })

  it('builds a single moment at time 0', () => {
    const mgr = solve([0], {
      'ENV.temperature.K': [250],
      'ENV.pressure.Pa': [90000],
      'CONC.A.mol m-3': [1.5],
      'PHOTO.photo1.s-1': [1.0e-4],
    })
    expect(mgr.getTimes()).toEqual([0])
    const conds = mgr.getConditionsAtTime(0)
    expect(conds.temperature).toBe(250)
    expect(conds.pressure).toBe(90000)
    expect(conds.rateParams['PHOTO.photo1']).toBe(1.0e-4)
    expect(mgr.concentrationEvents[0]['A']).toBe(1.5)
  })

  it('skips non-finite cells', () => {
    const mgr = solve([0], {
      'CONC.A.mol m-3': [NaN],
      'CONC.B.mol m-3': [2],
      'PHOTO.photo1.s-1': [undefined],
      'PHOTO.photo2.s-1': [3],
    })
    expect(mgr.concentrationEvents[0]).toEqual({ B: 2 })
    expect(mgr.getConditionsAtTime(0).rateParams).toEqual({ 'PHOTO.photo2': 3 })
  })

  it('builds one moment per time, with temperature/pressure interpolating', () => {
    const mgr = solve([0, 30, 60], {
      'ENV.temperature.K': [298.15, 300, 305],
      'ENV.pressure.Pa': [101325, 101000, 100500],
    })
    expect(mgr.getTimes()).toEqual([0, 30, 60])
    expect(mgr.getConditionsAtTime(30).temperature).toBe(300)
    expect(mgr.getConditionsAtTime(60).pressure).toBe(100500)
    // Step interpolation: still 305/100500 after the last configured point.
    expect(mgr.getConditionsAtTime(999).temperature).toBe(305)
  })

  it('routes PHOTO/EMIS headers to rate parameters', () => {
    const mgr = solve([0, 30], { 'PHOTO.photo1.s-1': [1.0e-4, 2.0e-4] })
    expect(mgr.getConditionsAtTime(0).rateParams['PHOTO.photo1']).toBe(1.0e-4)
    expect(mgr.getConditionsAtTime(30).rateParams['PHOTO.photo1']).toBe(2.0e-4)
  })

  it('routes CONC.* headers to concentration events at their own times', () => {
    const mgr = solve([0, 30], { 'CONC.A.mol m-3': [1.0, 0.5] })
    expect(mgr.concentrationEvents[0]['A']).toBe(1.0)
    expect(mgr.concentrationEvents[30]['A']).toBe(0.5)
  })

  it('routes the ENV.air number density.mol m-3 header to air density', () => {
    const mgr = solve([0, 30], { 'ENV.air number density.mol m-3': [40, 41] })
    expect(mgr.getConditionsAtTime(0).airDensity).toBe(40)
    expect(mgr.getConditionsAtTime(30).airDensity).toBe(41)
  })

  it('leaves a null cell alone rather than forcing it to 0', () => {
    // A blank cell means "not set", not zero. Without an override at t=30, ConditionsManager
    // carries forward the last set value (1.0e-4 from t=0).
    const mgr = solve([0, 30], { 'PHOTO.photo1.s-1': [1.0e-4, null] })
    expect(mgr.getConditionsAtTime(30).rateParams['PHOTO.photo1']).toBe(1.0e-4)
  })

  it('leaves ENV.temperature.K unset at later times that do not set it', () => {
    const mgr = solve([0, 30], {
      'ENV.temperature.K': [250, null],
      'PHOTO.photo1.s-1': [1.0e-4, 2.0e-4],
    })
    // Carried forward from time 0 via step interpolation, not re-set at time 30.
    expect(mgr.getConditionsAtTime(30).temperature).toBe(250)
    expect(mgr.timePoints.find((p) => p.t === 30).temp).toBeNull()
  })

  it('fills only an unset time-0 temperature or pressure with the default', () => {
    const mgr = solve([0, 30], {
      'ENV.temperature.K': [null, 310],
      'ENV.pressure.Pa': [90000, null],
    })
    expect(mgr.getConditionsAtTime(0).temperature).toBe(298.15)
    expect(mgr.getConditionsAtTime(0).pressure).toBe(90000)
    expect(mgr.getConditionsAtTime(30).temperature).toBe(310)
  })

  it('sets the defaults at time 0 when the table starts later', () => {
    const mgr = solve([100], { 'ENV.temperature.K': [300] })
    expect(mgr.getTimes()).toEqual([0, 100])
    expect(mgr.getConditionsAtTime(0).temperature).toBe(298.15)
    expect(mgr.getConditionsAtTime(100).temperature).toBe(300)
  })
})
