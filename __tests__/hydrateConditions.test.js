import { describe, it, expect } from 'vitest'

import { hydrateInitialConditions, hydrateEvolvingConditions } from '../src/utils/hydrateConditions'

// Pins hydrateConditions.js's observable behavior -- what the Initial/Evolving tabs and
// buildSolverConditions depend on.

describe('hydrateInitialConditions', () => {
  it('reads temperature, pressure, and concentrations from a single self-contained block', () => {
    const conditions = {
      data: [
        {
          headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa', 'CONC.A.mol m-3'],
          rows: [[0, 298.15, 101325, 1e-6]],
        },
      ],
    }
    const result = hydrateInitialConditions(conditions)
    expect(result.temperature).toBe(298.15)
    expect(result.pressure).toBe(101325)
    expect(result.concentrations).toEqual({ A: 1e-6 })
  })

  it('returns null temperature/pressure and empty concentrations when nothing is set', () => {
    const result = hydrateInitialConditions({})
    expect(result.temperature).toBeNull()
    expect(result.pressure).toBeNull()
    expect(result.concentrations).toEqual({})
    expect(result.rateConstants).toEqual({})
  })

  it('keeps rate-constant keys as the raw header string, unit suffix included', () => {
    const conditions = {
      data: [{ headers: ['time.s', 'PHOTO.O2_1.s-1'], rows: [[0, 1.47e-12]] }],
    }
    const result = hydrateInitialConditions(conditions)
    expect(result.rateConstants).toEqual({ 'PHOTO.O2_1.s-1': 1.47e-12 })
  })

  it('does not treat a multi-row (evolving) block as an initial snapshot for concentrations or rate constants', () => {
    const conditions = {
      data: [
        {
          headers: ['time.s', 'ENV.temperature.K', 'PHOTO.O2_1.s-1'],
          rows: [
            [0, 217.6, 1.47e-12],
            [3600, 217.6, 1.12e-13],
          ],
        },
      ],
    }
    const result = hydrateInitialConditions(conditions)
    expect(result.rateConstants).toEqual({})
  })

  it('borrows temperature/pressure from an evolving block when no snapshot provides it, without borrowing its rate constants', () => {
    const conditions = {
      data: [
        { headers: ['time.s', 'CONC.A.mol m-3'], rows: [[0, 1e-6]] },
        {
          headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa', 'PHOTO.O2_1.s-1'],
          rows: [
            [0, 217.6, 1394.3, 1.47e-12],
            [3600, 220.0, 1400.0, 1.12e-13],
          ],
        },
      ],
    }
    const result = hydrateInitialConditions(conditions)
    expect(result.temperature).toBe(217.6)
    expect(result.pressure).toBe(1394.3)
    expect(result.concentrations).toEqual({ A: 1e-6 })
    expect(result.rateConstants).toEqual({})
  })

  it('lets a snapshot block override a borrowed evolving value for the same quantity', () => {
    const conditions = {
      // Listed first, or find() would match this block instead of the snapshot below.
      data: [
        {
          headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa'],
          rows: [
            [0, 217.6, 1394.3],
            [3600, 220.0, 1400.0],
          ],
        },
        { headers: ['time.s', 'ENV.temperature.K'], rows: [[0, 300]] },
      ],
    }
    const result = hydrateInitialConditions(conditions)
    // Snapshot's own temperature wins over the borrowed evolving-block value.
    expect(result.temperature).toBe(300)
    // Pressure has no snapshot value, so it is still borrowed.
    expect(result.pressure).toBe(1394.3)
  })

  it('reads concentrations from a snapshot block whose own time.s is not 0 (TS1-shaped config)', () => {
    // TS1's real config: temperature/pressure at t=0, species concentrations at t=1000.
    const conditions = {
      data: [
        { headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa'], rows: [[0, 299.55, 99255.61]] },
        { headers: ['time.s', 'CONC.O3.mol m-3'], rows: [[1000, 5.95e-6]] },
      ],
    }
    const result = hydrateInitialConditions(conditions)
    expect(result.temperature).toBe(299.55)
    expect(result.pressure).toBe(99255.61)
    expect(result.concentrations).toEqual({ O3: 5.95e-6 })
  })

  it('reads a snapshot regardless of which position it sits at in data', () => {
    const conditions = {
      data: [
        { headers: ['time.s', 'CONC.A.mol m-3'], rows: [[0, 1e-6]] },
        {
          headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa', 'CONC.O3.mol m-3'],
          rows: [[0, 217.6, 1394.3, 6.43e-6]],
        },
      ],
    }
    const result = hydrateInitialConditions(conditions)
    expect(result.temperature).toBe(217.6)
    expect(result.concentrations).toEqual({ A: 1e-6, O3: 6.43e-6 })
  })
})

describe('hydrateEvolvingConditions', () => {
  it('is disabled when there is no evolving block', () => {
    const result = hydrateEvolvingConditions({})
    expect(result.enabled).toBe(false)
    expect(result.times).toEqual([])
  })

  it('excludes a lone ENV-only single-row snapshot -- that is just the static initial condition', () => {
    const conditions = {
      data: [
        {
          headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa'],
          rows: [[0, 298.15, 101325]],
        },
      ],
    }
    const result = hydrateEvolvingConditions(conditions)
    expect(result.enabled).toBe(false)
    expect(result.times).toEqual([])
  })

  it('matches TS1\'s real shape: an ENV-only snapshot at t=0 is excluded, but a t=1000 snapshot carrying rate data is included with its own ENV values', () => {
    const conditions = {
      data: [
        { headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa'], rows: [[0, 299.55169, 99255.61]] },
        {
          headers: ['time.s', 'ENV.pressure.Pa', 'ENV.temperature.K', 'PHOTO.jno2'],
          rows: [[1000, 1013.199, 287.45, 1.47e-12]],
        },
      ],
    }
    const result = hydrateEvolvingConditions(conditions)
    expect(result.enabled).toBe(true)
    expect(result.times).toEqual([1000])
    expect(result.temperature).toEqual([287.45])
    expect(result.pressure).toEqual([1013.199])
    expect(result.additionalSeries).toEqual({ 'PHOTO.jno2': [1.47e-12] })
  })

  it('still folds a rate-parameter snapshot with no ENV columns of its own into the series', () => {
    const conditions = {
      data: [
        { headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa'], rows: [[0, 299.55, 99255.61]] },
        { headers: ['time.s', 'PHOTO.O2_1.s-1'], rows: [[1000, 1.47e-12]] },
      ],
    }
    const result = hydrateEvolvingConditions(conditions)
    expect(result.enabled).toBe(true)
    // The t=0 block is ENV-only, so it's excluded; only the qualifying t=1000 point shows up.
    expect(result.times).toEqual([1000])
    expect(result.temperature).toEqual([null])
    expect(result.pressure).toEqual([null])
    expect(result.additionalSeries).toEqual({ 'PHOTO.O2_1.s-1': [1.47e-12] })
  })

  it('excludes CONC.* columns -- those belong to the Species tab, not this series', () => {
    const conditions = {
      data: [{ headers: ['time.s', 'ENV.temperature.K', 'CONC.O3.mol m-3'], rows: [[0, 298.15, 5.95e-6]] }],
    }
    const result = hydrateEvolvingConditions(conditions)
    expect(result.additionalSeries).toEqual({})
  })

  it('leaves temperature/pressure blank (null) when no block ever sets them, but keeps the point', () => {
    const conditions = {
      data: [{ headers: ['time.s', 'PHOTO.O2_1.s-1'], rows: [[0, 1.47e-12]] }],
    }
    const result = hydrateEvolvingConditions(conditions)
    expect(result.times).toEqual([0])
    expect(result.temperature).toEqual([null])
    expect(result.pressure).toEqual([null])
  })

  it('builds times/temperature/pressure and preserves raw additionalSeries headers', () => {
    const conditions = {
      data: [
        {
          headers: ['time.s', 'ENV.pressure.Pa', 'ENV.temperature.K', 'PHOTO.O2_1.s-1'],
          rows: [
            [0, 1394.3, 217.6, 1.47e-12],
            [3600, 1394.3, 217.6, 1.12e-13],
          ],
        },
      ],
    }
    const result = hydrateEvolvingConditions(conditions)
    expect(result.enabled).toBe(true)
    expect(result.times).toEqual([0, 3600])
    expect(result.temperature).toEqual([217.6, 217.6])
    expect(result.pressure).toEqual([1394.3, 1394.3])
    expect(result.additionalSeries).toEqual({ 'PHOTO.O2_1.s-1': [1.47e-12, 1.12e-13] })
  })

  it('sorts out-of-order rows by time', () => {
    const conditions = {
      data: [
        {
          headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa'],
          rows: [
            [3600, 220.0, 101000],
            [0, 217.6, 101325],
          ],
        },
      ],
    }
    const result = hydrateEvolvingConditions(conditions)
    expect(result.times).toEqual([0, 3600])
    expect(result.temperature).toEqual([217.6, 220.0])
  })

  it('finds the evolving block regardless of what file it came from', () => {
    // No filename or per-example slot tracking -- any evolving-shaped block works the same.
    const conditions = {
      data: [
        {
          headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa'],
          rows: [
            [0, 217.6, 1394.3],
            [3600, 220.0, 1400.0],
          ],
        },
      ],
    }
    const result = hydrateEvolvingConditions(conditions)
    expect(result.temperature).toEqual([217.6, 220.0])
  })
})
