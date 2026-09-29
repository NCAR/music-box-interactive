import { describe, it, expect } from 'vitest'
import {
  CONCENTRATION_UNITS,
  airDensityMolM3,
  concentrationDivisor,
  fromMolM3,
  isMixingRatioUnit,
  toMolM3,
} from '../src/utils/concentrationUnits'
import {
  DENSITY_SERIES_KEY,
  airDensitySeries,
  buildEnvironmentSeries,
  buildIntervalDivisors,
} from '../src/utils/environmentSeries'
import {
  computeIntegratedReactionRate,
  computeReactionSeries,
} from '../src/components/Plots/flowUtils'
import { buildTracerConcentrationKeys } from '../src/services/simulation/local/tracer'

const AIR = airDensityMolM3(101325, 298.15) // ~40.9 mol m-3

describe('concentration unit conversion', () => {
  it('offers mol m-3, ppm, ppb and ppt', () => {
    expect(CONCENTRATION_UNITS.map((u) => u.id)).toEqual(['mol_m3', 'ppm', 'ppb', 'ppt'])
  })

  it('leaves mol m-3 untouched and needs no air density', () => {
    expect(isMixingRatioUnit('mol_m3')).toBe(false)
    expect(toMolM3(2.5, 'mol_m3')).toBe(2.5)
    expect(fromMolM3(2.5, 'mol_m3')).toBe(2.5)
  })

  it.each([
    ['ppm', 1e-6],
    ['ppb', 1e-9],
    ['ppt', 1e-12],
  ])('scales %s by the air density', (unit, factor) => {
    expect(toMolM3(1, unit, AIR)).toBeCloseTo(factor * AIR, 20)
    expect(fromMolM3(factor * AIR, unit, AIR)).toBeCloseTo(1, 10)
  })

  it.each(['ppm', 'ppb', 'ppt'])('round-trips %s', (unit) => {
    expect(fromMolM3(toMolM3(37.5, unit, AIR), unit, AIR)).toBeCloseTo(37.5, 10)
  })

  it('gives a divisor matching fromMolM3', () => {
    expect(1e-6 / concentrationDivisor('ppb', AIR)).toBeCloseTo(fromMolM3(1e-6, 'ppb', AIR), 10)
    expect(concentrationDivisor('mol_m3', AIR)).toBe(1)
  })

  it('computes air density from pressure and temperature', () => {
    expect(AIR).toBeCloseTo(40.87, 1)
  })
})

describe('environment series', () => {
  const conditions = {
    initial: { temperature: 300, pressure: 100000 },
    evolving: {
      enabled: true,
      times: [0, 10],
      temperature: [null, 250],
      pressure: [null, 90000],
    },
  }
  const results = [{ time: 0 }, { time: 5 }, { time: 10 }, { time: 20 }]

  it('steps evolving values in at their time and keeps initial ones before', () => {
    const series = buildEnvironmentSeries(conditions, results)
    expect(series.map((p) => p.temperature)).toEqual([300, 300, 250, 250])
    expect(series.map((p) => p.pressure)).toEqual([100000, 100000, 90000, 90000])
  })

  it('uses initial conditions throughout when evolving is disabled', () => {
    const series = buildEnvironmentSeries({ ...conditions, evolving: { enabled: false } }, results)
    expect(series.every((p) => p.temperature === 300)).toBe(true)
  })

  it('prefers a provided air density over the ideal gas law, carrying it forward', () => {
    const withDensity = {
      ...conditions,
      evolving: {
        ...conditions.evolving,
        additionalSeries: { [DENSITY_SERIES_KEY]: [null, 55] },
      },
    }
    const series = buildEnvironmentSeries(withDensity, results)
    expect(series.map((p) => p.density)).toEqual([null, null, 55, 55])
    const densities = airDensitySeries(series)
    expect(densities[0]).toBeCloseTo(airDensityMolM3(100000, 300), 10)
    expect(densities.slice(2)).toEqual([55, 55])
  })
})

describe('interval divisors', () => {
  const series = buildEnvironmentSeries(
    {
      initial: { temperature: 300, pressure: 100000 },
      evolving: { enabled: true, times: [0, 10], temperature: [null, 250], pressure: [null, 90000] },
    },
    [{ time: 0 }, { time: 5 }, { time: 10 }, { time: 20 }]
  )

  it('is null when the unit needs no air density', () => {
    expect(buildIntervalDivisors('mol_m3', series)).toBeNull()
  })

  it('sums each interval converted with its own density', () => {
    const divisors = buildIntervalDivisors('ppb', series)
    const results = [0, 1, 3, 6].map((v, i) => ({
      time: series[i].time,
      concentrations: { 'tracer.0': v },
    }))
    const reaction = { name: 'r' }
    const keys = buildTracerConcentrationKeys(0, reaction.name)
    const withKeys = results.map((r) => ({
      time: r.time,
      concentrations: { [keys[0]]: r.concentrations['tracer.0'] },
    }))
    const expected = 1 / divisors[0] + 2 / divisors[1] + 3 / divisors[2]
    expect(computeIntegratedReactionRate(reaction, 0, withKeys, 0, 20, divisors)).toBeCloseTo(
      expected,
      12
    )
    // Without divisors it is still the plain difference between the window's endpoints.
    expect(computeIntegratedReactionRate(reaction, 0, withKeys, 0, 20)).toBe(6)

    const cumulative = computeReactionSeries(
      [{ key: 'r', reaction, index: 0 }],
      withKeys,
      0,
      20,
      divisors
    ).map((p) => p.r)
    expect(cumulative[0]).toBe(0)
    expect(cumulative[3]).toBeCloseTo(expected, 12)
  })
})
