import { describe, it, expect, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { MusicBox, writeConfigFiles, resolveConditionsFilepathsFromFile } from '@ncar/music-box'

import mechanismReducer from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { loadMusicBoxConfig, toReduxConfig } from '../src/services/config/loadMusicBoxConfig'
import { rateReactionNames } from '../src/services/simulation/local/reactionNames'
import { buildLocalSimulationPayload } from '../src/services/simulation/local/payload'
import { buildSolverConditions } from '../src/services/simulation/local/conditions'

import analyticalConfig from '@ncar/music-box/examples/analytical/my_config.json' with { type: 'json' }
import chapmanConfig from '@ncar/music-box/examples/chapman/my_config.json' with { type: 'json' }
import flowTubeConfig from '@ncar/music-box/examples/flow_tube/my_config.json' with { type: 'json' }
import carbonBond5Config from '@ncar/music-box/examples/carbon_bond_5/my_config.json' with { type: 'json' }
import ts1Config from '@ncar/music-box/examples/ts1/my_config.json' with { type: 'json' }

const exampleCsvs = import.meta.glob('/node_modules/@ncar/music-box/examples/*/*.csv', {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('rateReactionNames', () => {
  it('keeps a configured name and generates the formula for an unnamed reaction', () => {
    const names = rateReactionNames([
      { id: 'a', type: 'PHOTOLYSIS', name: 'jno2' },
      { id: 'b', type: 'PHOTOLYSIS', name: '', reactants: [{ name: 'O3' }], products: [{ name: 'O' }, { name: 'O2' }] },
      { id: 'c', type: 'EMISSION', products: [{ name: 'NO' }] },
      { id: 'd', type: 'FIRST_ORDER_LOSS', reactants: [{ name: 'O3' }] },
      { id: 'e', type: 'SURFACE', 'gas-phase species': 'N2O5', 'gas-phase products': [{ name: 'HNO3', coefficient: 2 }] },
      { id: 'f', type: 'ARRHENIUS', reactants: [{ name: 'A' }] },
    ])
    expect(Object.fromEntries(names)).toEqual({
      a: 'jno2',
      b: 'O3 -> O + O2',
      c: '-> NO',
      d: 'O3 ->',
      e: 'N2O5 -> 2 HNO3',
    })
  })

  it('writes a dot in a coefficient as p, and adds a suffix to a duplicate', () => {
    const reaction = { type: 'PHOTOLYSIS', reactants: [{ name: 'O3', coefficient: 0.5 }], products: [{ name: 'O2' }] }
    const names = rateReactionNames([
      { ...reaction, id: 'a' },
      { ...reaction, id: 'b' },
      // A configured name always wins over a generated one.
      { id: 'c', type: 'PHOTOLYSIS', name: '0p5 O3 -> O2 (3)' },
    ])
    expect(Object.fromEntries(names)).toEqual({ a: '0p5 O3 -> O2', b: '0p5 O3 -> O2 (2)', c: '0p5 O3 -> O2 (3)' })
  })
})

describe('an unnamed photolysis reaction in the solver', () => {
  it('gets the generated name in the payload, and its rate parameter reaches the solver', async () => {
    const config = {
      'box model options': {
        grid: 'box',
        'chemistry time step [sec]': 1,
        'output time step [sec]': 1,
        'simulation length [sec]': 2,
      },
      conditions: {},
      mechanism: {
        name: 'unnamed',
        version: '1.0.0',
        species: [{ name: 'A' }, { name: 'B' }],
        phases: [{ name: 'gas', species: [{ name: 'A' }, { name: 'B' }] }],
        reactions: [
          { type: 'PHOTOLYSIS', 'gas phase': 'gas', reactants: [{ name: 'A' }], products: [{ name: 'B' }] },
        ],
      },
    }
    const { mechanism } = await toReduxConfig(config)
    const [reaction] = mechanism.reactions
    const conditions = {
      basic: { timeStep: 1, outputFrequency: 1, duration: 2 },
      table: {
        times: [0],
        columns: { 'CONC.A.mol m-3': [1], [`PHOTO#${reaction.id}`]: [0.5] },
      },
    }

    expect(reaction.name).toBe('')
    expect(buildSolverConditions(conditions, mechanism.reactions).data[0].headers).toContain('PHOTO.A -> B.s-1')

    const { payload } = buildLocalSimulationPayload({ mechanismData: { config: { mechanism } }, conditions })
    expect(payload.mechanism.reactions[0].name).toBe('A -> B')

    const result = await MusicBox.fromJson(payload).solve()
    const a = result.data['CONC.A.mol m-3'] ?? result.data[result.columns.find((c) => c.startsWith('CONC.A'))]
    // A photolysis rate of 0.5 s-1 removes A; without the match, A would stay at 1.
    expect(a.at(-1)).toBeLessThan(0.9)
  }, 30000)
})

describe('the bundled examples', () => {
  it.each([
    ['analytical', analyticalConfig],
    ['carbon_bond_5', carbonBond5Config],
    ['chapman', chapmanConfig],
    ['flow_tube', flowTubeConfig],
    ['ts1', ts1Config],
  ])('%s binds every rate parameter to a reaction', async (dir, exampleConfig) => {
    const csvs = Object.fromEntries(
      Object.entries(exampleCsvs)
        .filter(([path]) => path.includes(`/examples/${dir}/`))
        .map(([path, text]) => [path.split('/').at(-1), text])
    )
    await writeConfigFiles(`/test-examples/${dir}`, csvs)
    const config = await resolveConditionsFilepathsFromFile(exampleConfig, `/test-examples/${dir}`)

    const store = configureStore({
      reducer: { mechanism: mechanismReducer, conditions: conditionsReducer, simulation: simulationReducer },
    })
    const result = await loadMusicBoxConfig(config, { dispatch: store.dispatch, navigate: vi.fn(), meta: {} })

    expect(result.unmatchedRateParameters).toEqual([])
    expect(result.ignoredThirdBodySpecies).toEqual([])
  }, 30000)
})
