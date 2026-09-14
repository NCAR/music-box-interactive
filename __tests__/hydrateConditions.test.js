import { describe, it, expect } from 'vitest'

import { hydrateInitialConditions, hydrateEvolvingConditions } from '../src/utils/hydrateConditions'

// Pins hydrateConditions.js's observable behavior -- what the Initial/Evolving tabs and
// buildSolverConditions depend on.

describe('hydrateInitialConditions', () => {
  it('reads temperature, pressure, and concentrations from a single self-contained block', () => {
    const exampleFiles = {
      data: [
        {
          headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa', 'CONC.A.mol m-3'],
          rows: [[0, 298.15, 101325, 1e-6]],
        },
      ],
    }
    const result = hydrateInitialConditions(exampleFiles)
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
    const exampleFiles = {
      data: [{ headers: ['time.s', 'PHOTO.O2_1.s-1'], rows: [[0, 1.47e-12]] }],
    }
    const result = hydrateInitialConditions(exampleFiles)
    expect(result.rateConstants).toEqual({ 'PHOTO.O2_1.s-1': 1.47e-12 })
  })

  it('does not treat a multi-row (evolving) block as an initial snapshot for concentrations or rate constants', () => {
    const exampleFiles = {
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
    const result = hydrateInitialConditions(exampleFiles)
    expect(result.rateConstants).toEqual({})
  })

  it('borrows temperature/pressure from an evolving block when no snapshot provides it, without borrowing its rate constants', () => {
    const exampleFiles = {
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
    const result = hydrateInitialConditions(exampleFiles)
    expect(result.temperature).toBe(217.6)
    expect(result.pressure).toBe(1394.3)
    expect(result.concentrations).toEqual({ A: 1e-6 })
    expect(result.rateConstants).toEqual({})
  })

  it('lets a snapshot block override a borrowed evolving value for the same quantity', () => {
    const exampleFiles = {
      // Listed first: the fallback finder is a plain .find() and would otherwise match
      // the snapshot block below, which also has an ENV.* header.
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
    const result = hydrateInitialConditions(exampleFiles)
    // Snapshot's own temperature wins over the borrowed evolving-block value.
    expect(result.temperature).toBe(300)
    // Pressure has no snapshot value, so it is still borrowed.
    expect(result.pressure).toBe(1394.3)
  })

  it('honors the named example-loader slots the same as a generic data block', () => {
    const exampleFiles = {
      initial_concentrations: {
        headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa', 'CONC.O3.mol m-3'],
        rows: [[0, 217.6, 1394.3, 6.43e-6]],
      },
      data: [],
    }
    const result = hydrateInitialConditions(exampleFiles)
    expect(result.temperature).toBe(217.6)
    expect(result.concentrations).toEqual({ O3: 6.43e-6 })
  })
})

describe('hydrateEvolvingConditions', () => {
  it('is disabled when there is no evolving block', () => {
    const result = hydrateEvolvingConditions({})
    expect(result.enabled).toBe(false)
    expect(result.times).toEqual([])
  })

  it('requires more than one row to count as an evolving series', () => {
    const exampleFiles = {
      data: [
        {
          headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa'],
          rows: [[0, 298.15, 101325]],
        },
      ],
    }
    const result = hydrateEvolvingConditions(exampleFiles)
    expect(result.enabled).toBe(false)
  })

  it('builds times/temperature/pressure and preserves raw additionalSeries headers', () => {
    const exampleFiles = {
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
    const result = hydrateEvolvingConditions(exampleFiles)
    expect(result.enabled).toBe(true)
    expect(result.times).toEqual([0, 3600])
    expect(result.temperature).toEqual([217.6, 217.6])
    expect(result.pressure).toEqual([1394.3, 1394.3])
    expect(result.additionalSeries).toEqual({ 'PHOTO.O2_1.s-1': [1.47e-12, 1.12e-13] })
  })

  it('sorts out-of-order rows by time', () => {
    const exampleFiles = {
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
    const result = hydrateEvolvingConditions(exampleFiles)
    expect(result.times).toEqual([0, 3600])
    expect(result.temperature).toEqual([217.6, 220.0])
  })

  it('prefers the named boulder slot over a generic data block', () => {
    const exampleFiles = {
      boulder: {
        headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa'],
        rows: [
          [0, 217.6, 1394.3],
          [3600, 220.0, 1400.0],
        ],
      },
      data: [
        {
          headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa'],
          rows: [
            [0, 999, 999],
            [3600, 999, 999],
          ],
        },
      ],
    }
    const result = hydrateEvolvingConditions(exampleFiles)
    expect(result.temperature).toEqual([217.6, 220.0])
  })
})
