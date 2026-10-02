import { describe, it, expect } from 'vitest'
import {
  CONCENTRATION_UNITS,
  airDensityMolM3,
  buildIntervalDivisors,
  concentrationDivisor,
  fromMolM3,
  fromMolM3Array,
  isMixingRatioUnit,
  toMolM3,
} from '../src/utils/concentrationUnits'
import { normalizeSimulationResults } from '../src/services/simulation/local/results'
import { airDensitiesFromResults, buildEnvironmentSeries } from '../src/utils/environmentSeries'
import {
  computeIntegratedReactionRate,
  computeReactionSeries,
} from '../src/components/Plots/flowUtils'
import { buildTracerConcentrationKeys } from '../src/services/simulation/local/tracer'

const AIR = airDensityMolM3(101325, 298.15) // ~40.9 mol m-3

describe('concentration unit conversion', () => {
  it('offers mol m-3, ppth, ppm, ppb and ppt', () => {
    expect(CONCENTRATION_UNITS.map((u) => u.id)).toEqual(['mol_m3', 'ppth', 'ppm', 'ppb', 'ppt'])
  })

  it('leaves mol m-3 untouched and needs no air density', () => {
    expect(isMixingRatioUnit('mol_m3')).toBe(false)
    expect(toMolM3(2.5, 'mol_m3')).toBe(2.5)
    expect(fromMolM3(2.5, 'mol_m3')).toBe(2.5)
  })

  it.each([
    ['ppth', 1e-3],
    ['ppm', 1e-6],
    ['ppb', 1e-9],
    ['ppt', 1e-12],
  ])('scales %s by the air density', (unit, factor) => {
    expect(toMolM3(1, unit, AIR)).toBeCloseTo(factor * AIR, 20)
    expect(fromMolM3(factor * AIR, unit, AIR)).toBeCloseTo(1, 10)
  })

  it.each(['ppth', 'ppm', 'ppb', 'ppt'])('round-trips %s', (unit) => {
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

const solved = (rows) =>
  rows.map(([time, temperature, pressure, airDensity]) => ({
    time,
    concentrations: {},
    environment: { temperature, pressure, airDensity },
  }))

describe('environment series', () => {
  it('reads temperature and pressure from the solver output', () => {
    const series = buildEnvironmentSeries(
      solved([
        [0, 300, 100000, 40.1],
        [10, 250, 90000, 43.3],
      ])
    )
    expect(series).toEqual([
      { time: 0, temperature: 300, pressure: 100000 },
      { time: 10, temperature: 250, pressure: 90000 },
    ])
  })

  it('returns nothing for missing results', () => {
    expect(buildEnvironmentSeries(null)).toEqual([])
  })
})

describe('air densities from results', () => {
  it('uses the solver density as is, without recomputing from temperature and pressure', () => {
    expect(airDensitiesFromResults(solved([[0, 300, 100000, 55], [5, 300, 100000, 56]]))).toEqual([
      55, 56,
    ])
  })

  it('reports none when any point lacks a density, rather than guessing', () => {
    expect(airDensitiesFromResults(solved([[0, 300, 100000, 55], [5, 300, 100000, null]]))).toBeNull()
    expect(airDensitiesFromResults(solved([[0, 300, 100000, 0]]))).toBeNull()
    expect(airDensitiesFromResults([{ time: 0, concentrations: {} }])).toBeNull()
    expect(airDensitiesFromResults(null)).toBeNull()
    expect(airDensitiesFromResults([])).toBeNull()
  })
})

describe('array conversion', () => {
  it('converts each value with its own air density', () => {
    const densities = [40, 50]
    expect(fromMolM3Array([4e-8, 5e-8], 'ppb', densities)).toEqual([
      fromMolM3(4e-8, 'ppb', 40),
      fromMolM3(5e-8, 'ppb', 50),
    ])
    expect(fromMolM3Array([1, 2], 'mol_m3', densities)).toEqual([1, 2])
  })
})

describe('interval divisors', () => {
  const densities = [airDensityMolM3(100000, 300), airDensityMolM3(100000, 300), airDensityMolM3(90000, 250), airDensityMolM3(90000, 250)]
  const times = [0, 5, 10, 20]

  it('is null when the unit needs no air density, or none is known', () => {
    expect(buildIntervalDivisors('mol_m3', densities)).toBeNull()
    expect(buildIntervalDivisors('ppb', null)).toBeNull()
  })

  it('sums each interval converted with its own density', () => {
    const divisors = buildIntervalDivisors('ppb', densities)
    const reaction = { name: 'r' }
    const [key] = buildTracerConcentrationKeys(reaction, 0)
    const results = [0, 1, 3, 6].map((value, i) => ({
      time: times[i],
      concentrations: { [key]: value },
    }))

    const expected = 1 / divisors[0] + 2 / divisors[1] + 3 / divisors[2]
    expect(computeIntegratedReactionRate(reaction, 0, results, 0, 20, divisors)).toBeCloseTo(
      expected,
      12
    )
    // Without divisors it is still the plain difference between the window's endpoints.
    expect(computeIntegratedReactionRate(reaction, 0, results, 0, 20)).toBe(6)

    const cumulative = computeReactionSeries(
      [{ key: 'r', reaction, index: 0 }],
      results,
      0,
      20,
      divisors
    ).map((p) => p.r)
    expect(cumulative[0]).toBe(0)
    expect(cumulative[3]).toBeCloseTo(expected, 12)
  })
})

describe('solver output parsing', () => {
  it('carries the environment columns beside, not among, the concentrations', () => {
    const [point] = normalizeSimulationResults({
      columns: [
        'time.s',
        'ENV.temperature.K',
        'ENV.pressure.Pa',
        'ENV.air number density.mol m-3',
        'CONC.O3.mol m-3',
      ],
      data: {
        'time.s': [0],
        'ENV.temperature.K': [298.15],
        'ENV.pressure.Pa': [101325],
        'ENV.air number density.mol m-3': [40.87],
        'CONC.O3.mol m-3': [1e-6],
      },
    })
    expect(point.environment).toEqual({ temperature: 298.15, pressure: 101325, airDensity: 40.87 })
    expect(Object.keys(point.concentrations)).toEqual(['CONC.O3.mol m-3'])
  })
})
