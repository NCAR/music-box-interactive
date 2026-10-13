import { describe, it, expect } from 'vitest'
import { toReduxConfig } from '../src/services/config/loadMusicBoxConfig'
import { runLocalSimulation } from '../src/services/simulation/local/run'
import { computeIntegratedReactionRate } from '../src/components/Plots/flowUtils'
import { buildResultsExport } from '../src/services/results/downloadResults'

// The flux diagram and the reaction rate plots read each reaction's tracer species by the
// reaction's index and its name in Redux. An unnamed rate-parameter reaction gets a generated
// name only in the solver payload, so the tracer must not depend on that name.
describe('integrated rate of an unnamed emission reaction', () => {
  it('equals the emission rate times the time step', async () => {
    const { mechanism } = await toReduxConfig({
      mechanism: {
        name: 'emission',
        version: '1.0.0',
        species: [{ name: 'A' }],
        phases: [{ name: 'gas', species: [{ name: 'A' }] }],
        reactions: [{ type: 'EMISSION', 'gas phase': 'gas', products: [{ name: 'A' }] }],
      },
    })
    const [reaction] = mechanism.reactions
    expect(reaction.name).toBe('')

    const { excludedResults } = await runLocalSimulation({
      mechanismData: { config: { mechanism }, currentExample: { name: 'emission' } },
      conditions: {
        basic: { duration: 60, timeStep: 30, outputFrequency: 30 },
        table: {
          times: [0],
          columns: { 'CONC.A.mol m-3': [0], [`EMIS#${reaction.id}`]: [1] },
        },
      },
    })

    // 1 mol m-3 s-1 for each 30 s step.
    expect(computeIntegratedReactionRate(reaction, 0, excludedResults, 0, 30)).toBeCloseTo(30, 6)
    expect(computeIntegratedReactionRate(reaction, 0, excludedResults, 0, 60)).toBeCloseTo(60, 6)
  }, 30000)
})

describe('the results download', () => {
  it('writes each flux as IRR.<id>.mol m-3, and maps the id to the config name and formula', async () => {
    const { mechanism } = await toReduxConfig({
      mechanism: {
        name: 'emission',
        version: '1.0.0',
        species: [{ name: 'A' }],
        phases: [{ name: 'gas', species: [{ name: 'A' }] }],
        reactions: [{ type: 'EMISSION', 'gas phase': 'gas', products: [{ name: 'A' }] }],
      },
    })
    const [reaction] = mechanism.reactions
    const mechanismData = { config: { mechanism }, currentExample: { name: 'emission' } }
    const conditions = {
      basic: { duration: 60, timeStep: 30, outputFrequency: 30 },
      table: { times: [0], columns: { 'CONC.A.mol m-3': [0], [`EMIS#${reaction.id}`]: [1] } },
    }
    const { results, excludedResults } = await runLocalSimulation({ mechanismData, conditions })

    const { resultsCsv, mapping, config } = buildResultsExport({
      mechanism: mechanismData,
      conditions,
      results,
      excludedResults,
      metadata: {},
    })

    const [headerLine, firstRow] = resultsCsv.split('\n')
    const headers = headerLine.split(',')
    const irr = `IRR.${reaction.id}.mol m-3`
    expect(headers).toContain(irr)
    expect(Number(firstRow.split(',')[headers.indexOf(irr)])).toBeCloseTo(30, 6)

    // The name agrees with the config in the same zip.
    expect(config.mechanism.reactions[0].name).toBe('-> A')
    expect(mapping).toEqual({ [reaction.id]: { name: '-> A', type: 'EMISSION', formula: '∅ → A' } })
  }, 30000)
})
