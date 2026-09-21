import fs from 'fs'
import path from 'path'
import { MusicBox } from '@ncar/music-box'
import { describe, it, expect } from 'vitest'
import { runVectorizedGridScan } from '../src/services/simulation/local/vectorizedGridScan'
import { buildTracedSimulationPayload } from '../src/services/simulation/local/tracedPayload'

const configPath = path.resolve(
  import.meta.dirname,
  '../node_modules/@ncar/music-box/examples/chapman/my_config.json'
)
const chapmanConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))

const mechanismData = {
  species: [],
  reactions: [],
  mechanism: { mechanism: chapmanConfig.mechanism },
  currentExample: { id: 'chapman-verify', name: 'Chapman Verify' },
}

const baseConditions = {
  basic: { duration: 3600 * 6, timeStep: 60, outputFrequency: 60 },
  initial: {
    temperature: 298.15,
    pressure: 101325,
    concentrations: {
      M: 2.7e19,
      N2: 2.1e19,
      O2: 5.7e18,
      O3: 6.0e-9 * 2.7e19,
      O: 1e-15,
      O1D: 1e-20,
    },
  },
  evolving: {
    enabled: false,
    times: [],
    temperature: [],
    pressure: [],
    additionalSeries: {},
    rateConstants: {},
  },
  rateConstants: {},
  conditions: {},
}

// A small grid scaling O3 (X) and O (Y) from the baseline -- enough cells/timesteps to be a
// meaningful check without making routine test runs slow.
const GRID_N = 10
const factors = Array.from({ length: GRID_N }, (_, i) => 0.3 + (i * (3.0 - 0.3)) / (GRID_N - 1))
const conditionsList = []
for (let row = 0; row < GRID_N; row++) {
  for (let col = 0; col < GRID_N; col++) {
    const concentrations = { ...baseConditions.initial.concentrations }
    concentrations.O3 = baseConditions.initial.concentrations.O3 * factors[col]
    concentrations.O = baseConditions.initial.concentrations.O * factors[row]
    conditionsList.push({
      ...baseConditions,
      initial: { ...baseConditions.initial, concentrations },
    })
  }
}

// 'M' (third-body air density) is a pseudo-species this mechanism doesn't track independently
// in solver output -- both paths omit it, so it's excluded here rather than compared as if it
// were missing on only one side.
const REAL_SPECIES = new Set(['N2', 'O2', 'O3', 'O', 'O1D'])

// Solves the same grid one cell at a time on a single reused MusicBox instance -- the pre-existing
// approach IsoplethsPage falls back to when the fast path can't handle a mechanism.
async function sequentialSolve() {
  const results = []
  let box = null
  const t0 = performance.now()
  for (const conditions of conditionsList) {
    const { payload } = buildTracedSimulationPayload({ mechanismData, conditions })
    if (!box) {
      box = MusicBox.fromJson(payload, { reuseSolver: true })
    } else {
      box.updateConfig(payload)
    }
    const raw = await box.solve()
    const lastIdx = raw.data['time.s'].length - 1
    const out = {}
    for (const col of raw.columns) {
      if (col.startsWith('CONC.')) {
        const name = col.replace(/^CONC\./, '').replace(/\.mol m-3$/, '')
        out[name] = raw.data[col][lastIdx]
      }
    }
    results.push(out)
  }
  box.dispose()
  return { results, ms: performance.now() - t0 }
}

describe('runVectorizedGridScan vs sequential MusicBox solving', () => {
  it('matches the sequential path exactly for real species, and is faster', async () => {
    const sequential = await sequentialSolve()

    const t0 = performance.now()
    const vectorized = await runVectorizedGridScan({
      mechanismData,
      conditionsList,
      onProgress: () => {},
      isCancelled: () => false,
    })
    const vectorizedMs = performance.now() - t0

    expect(vectorized).toHaveLength(conditionsList.length)

    // Tracer species (buildTracedSimulationPayload's injected reaction-rate products) are
    // excluded here -- see runVectorizedGridScan's own doc comment for why they can diverge
    // harmlessly and are unreachable through Isopleths' actual output-species picker anyway.
    let maxRelDiff = 0
    for (let i = 0; i < conditionsList.length; i++) {
      for (const name of REAL_SPECIES) {
        const a = sequential.results[i][name]
        const b = vectorized[i][name]
        const denom = Math.max(Math.abs(a), Math.abs(b), 1e-30)
        maxRelDiff = Math.max(maxRelDiff, Math.abs(a - b) / denom)
      }
    }

    expect(maxRelDiff).toBeLessThan(1e-6)
    // Loose, not tied to a specific ratio -- that scales with grid size/duration/hardware.
    expect(vectorizedMs).toBeLessThan(sequential.ms)
  }, 60000)
})
