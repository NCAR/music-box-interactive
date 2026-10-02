import { describe, it, expect, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'

import mechanismReducer, { addSpecies, addReaction } from '../../../src/redux/slices/mechanismSlice'
import conditionsReducer from '../../../src/redux/slices/conditionsSlice'
import simulationReducer, { setStatus } from '../../../src/redux/slices/simulationSlice'
import {
  loadMusicBoxConfig,
  notifyIgnoredThirdBodySpecies,
  notifyLoadedConditionsIssues,
  toReduxConfig,
} from '../../../src/services/config/loadMusicBoxConfig'

// Exercises loadMusicBoxConfig directly -- the step between parsing an uploaded/example config
// and it actually landing in Redux, which nothing else in the suite calls outside of
// ExampleLoader's own reaction-naming test.

const makeStore = () =>
  configureStore({
    reducer: {
      mechanism: mechanismReducer,
      conditions: conditionsReducer,
      simulation: simulationReducer,
    },
  })

const baseConfig = (overrides = {}) => ({
  'box model options': {
    grid: 'box',
    'chemistry time step [sec]': 2,
    'output time step [sec]': 4,
    'simulation length [sec]': 100,
  },
  conditions: { data: [{ headers: ['time.s'], rows: [[0]] }] },
  mechanism: {
    name: 'Test Mechanism',
    version: '1.0.0',
    species: [
      { name: 'A' },
      {
        name: 'B',
        'absolute tolerance': 1e-12,
        'is third body': true,
      },
    ],
    phases: [
      {
        name: 'gas',
        species: [
          { name: 'A' },
          { name: 'B', 'diffusion coefficient [m2 s-1]': 1e-5, 'density [kg m-3]': 1000 },
        ],
      },
    ],
    reactions: [
      {
        type: 'ARRHENIUS',
        name: 'r1',
        'gas phase': 'gas',
        reactants: [{ name: 'A' }],
        products: [],
      },
      { type: 'ARRHENIUS', 'gas phase': 'gas', reactants: [{ name: 'B' }], products: [] },
    ],
  },
  ...overrides,
})

const load = async (config, meta = {}) => {
  const store = makeStore()
  const navigate = vi.fn()
  await loadMusicBoxConfig(config, { dispatch: store.dispatch, navigate, meta })
  return { store, navigate }
}

describe('loadMusicBoxConfig', () => {
  it('loads species with their declared properties', async () => {
    const { store } = await load(baseConfig())
    const species = store.getState().mechanism.config.mechanism.species

    expect(species).toHaveLength(2)
    const a = species.find((s) => s.name === 'A')
    const b = species.find((s) => s.name === 'B')
    expect(a.phase).toBeUndefined() // phase membership stays on phases[]
    expect(b['absolute tolerance']).toBe(1e-12)
    expect(b['is third body']).toBe(true)
  })

  it('keeps phase-only properties (diffusion coefficient, density) on the phase entries', async () => {
    const { store } = await load(baseConfig())
    const { species, phases } = store.getState().mechanism.config.mechanism
    const b = species.find((s) => s.name === 'B')
    const bEntry = phases[0].species.find((e) => e.name === 'B')

    expect(bEntry['diffusion coefficient [m2 s-1]']).toBe(1e-5)
    expect(bEntry['density [kg m-3]']).toBe(1000)
    expect(b['diffusion coefficient [m2 s-1]']).toBeUndefined()
    expect(b['density [kg m-3]']).toBeUndefined()
  })

  it('stores the phases as the config declares them', async () => {
    const config = baseConfig({
      mechanism: {
        ...baseConfig().mechanism,
        phases: [
          { name: 'aqueous', species: [{ name: 'A' }] },
          { name: 'gas', species: [{ name: 'B' }] },
        ],
        reactions: [],
      },
    })
    const { store } = await load(config)
    const { phases } = store.getState().mechanism.config.mechanism

    expect(phases.map((p) => [p.name, p.species.map((e) => e.name)])).toEqual([
      ['aqueous', ['A']],
      ['gas', ['B']],
    ])
  })

  it('keeps a declared reaction name, and leaves an undeclared one empty', async () => {
    const { store } = await load(baseConfig())
    const reactions = store.getState().mechanism.config.mechanism.reactions

    expect(reactions[0].name).toBe('r1')
    // MUSICA's parser gives an undeclared reaction name as an empty string.
    expect(reactions[1].name).toBe('')
    expect(reactions.every((r) => typeof r.id === 'string' && r.id.length > 0)).toBe(true)
  })

  it('converts box model options into seconds in the conditions slice', async () => {
    const { store } = await load(baseConfig())
    const { basic } = store.getState().conditions

    expect(basic.timeStep).toBe(2)
    expect(basic.outputFrequency).toBe(4)
    expect(basic.duration).toBe(100)
  })

  it('converts the conditions into the table once, and stores the full uploaded config', async () => {
    const config = baseConfig({
      conditions: {
        data: [
          { headers: ['time.s', 'ENV.temperature.K', 'CONC.A.mol m-3'], rows: [[0, 250, 1e-6]] },
          { headers: ['time.s', 'PHOTO.p1.s-1'], rows: [[0, 1e-4], [60, 2e-4]] },
        ],
      },
    })
    const { store } = await load(config)
    const storedConfig = store.getState().mechanism.config

    // PHOTO.p1 names no reaction of the mechanism, so it is not loaded.
    expect(store.getState().conditions.table).toEqual({
      times: [0, 60],
      columns: {
        'ENV.temperature.K': [250, null],
        'CONC.A.mol m-3': [1e-6, null],
      },
    })
    expect(storedConfig['box model options']).toEqual(config['box model options'])
    expect(storedConfig.mechanism.name).toBe(config.mechanism.name)
    expect(storedConfig.mechanism.phases).toEqual(config.mechanism.phases)
    // Species/reactions are the same objects, decorated (phase default, id) -- not byte-identical.
    expect(storedConfig.mechanism.species.map((s) => s.name)).toEqual(
      config.mechanism.species.map((s) => s.name)
    )
    expect(storedConfig.mechanism.reactions.map((r) => r.type)).toEqual(
      config.mechanism.reactions.map((r) => r.type)
    )
  })

  it('records the passed-in example metadata', async () => {
    const meta = {
      id: 'chapman',
      name: 'Chapman',
      description: 'desc',
      mechanism_name: 'Chapman Mechanism',
    }
    const { store } = await load(baseConfig(), meta)
    const state = store.getState()

    expect(state.mechanism.currentExample).toEqual(meta)
    expect(state.mechanism.selectedMechanism).toBe('Chapman Mechanism')
  })

  it('ignores a third-body concentration and reports the species', async () => {
    const config = baseConfig({
      conditions: {
        data: [{ headers: ['time.s', 'CONC.A.mol m-3', 'CONC.B.mol m-3'], rows: [[0, 1, 2]] }],
      },
    })
    const store = makeStore()
    const result = await loadMusicBoxConfig(config, {
      dispatch: store.dispatch,
      navigate: vi.fn(),
      meta: {},
    })

    // B is the third body in baseConfig.
    expect(result).toEqual({ ignoredThirdBodySpecies: ['B'], unmatchedRateParameters: [] })
    expect(store.getState().conditions.table).toEqual({
      times: [0],
      columns: { 'CONC.A.mol m-3': [1] },
    })
  })

  it('stores a rate parameter under its reaction id, and reports one that names no reaction', async () => {
    const config = baseConfig({
      conditions: {
        data: [{ headers: ['time.s', 'PHOTO.jA.s-1', 'PHOTO.missing.s-1'], rows: [[0, 1e-4, 2e-4]] }],
      },
      mechanism: {
        ...baseConfig().mechanism,
        reactions: [
          { type: 'PHOTOLYSIS', name: 'jA', 'gas phase': 'gas', reactants: [{ name: 'A' }], products: [{ name: 'B' }] },
        ],
      },
    })
    const store = makeStore()
    const result = await loadMusicBoxConfig(config, { dispatch: store.dispatch, navigate: vi.fn(), meta: {} })

    const [reaction] = store.getState().mechanism.config.mechanism.reactions
    expect(store.getState().conditions.table.columns).toEqual({ [`PHOTO#${reaction.id}`]: [1e-4] })
    expect(result.unmatchedRateParameters).toEqual(['PHOTO.missing.s-1'])
  })

  it('matches a rate parameter to an unnamed reaction by its generated name', async () => {
    const config = baseConfig({
      conditions: {
        data: [{ headers: ['time.s', 'PHOTO.A -> B.s-1'], rows: [[0, 3e-4]] }],
      },
      mechanism: {
        ...baseConfig().mechanism,
        reactions: [
          { type: 'PHOTOLYSIS', 'gas phase': 'gas', reactants: [{ name: 'A' }], products: [{ name: 'B' }] },
        ],
      },
    })
    const store = makeStore()
    const result = await loadMusicBoxConfig(config, { dispatch: store.dispatch, navigate: vi.fn(), meta: {} })

    const [reaction] = store.getState().mechanism.config.mechanism.reactions
    // The stored name stays empty; only the column links to the reaction.
    expect(reaction.name).toBe('')
    expect(store.getState().conditions.table.columns).toEqual({ [`PHOTO#${reaction.id}`]: [3e-4] })
    expect(result.unmatchedRateParameters).toEqual([])
  })

  it('reports nothing when no third-body concentration is set', async () => {
    const store = makeStore()
    const result = await loadMusicBoxConfig(baseConfig(), {
      dispatch: store.dispatch,
      navigate: vi.fn(),
      meta: {},
    })
    expect(result).toEqual({ ignoredThirdBodySpecies: [], unmatchedRateParameters: [] })
  })

  it('falls back to the example id, then "custom", when no mechanism_name is given', async () => {
    expect(
      (await load(baseConfig(), { id: 'uploaded' })).store.getState().mechanism.selectedMechanism
    ).toBe('uploaded')
    expect((await load(baseConfig(), {})).store.getState().mechanism.selectedMechanism).toBe(
      'custom'
    )
  })

  it('navigates to /mechanism after loading', async () => {
    const { navigate } = await load(baseConfig())
    expect(navigate).toHaveBeenCalledWith('/mechanism')
  })

  it('replaces stale state instead of appending to it', async () => {
    const store = makeStore()
    store.dispatch(addSpecies({ name: 'Stale', phase: 'gas' }))
    store.dispatch(addReaction({ type: 'ARRHENIUS', name: 'stale-reaction', id: 'stale-id' }))
    store.dispatch(setStatus('succeeded'))

    await loadMusicBoxConfig(baseConfig(), {
      dispatch: store.dispatch,
      navigate: vi.fn(),
      meta: {},
    })
    const state = store.getState()

    expect(state.mechanism.config.mechanism.species.map((s) => s.name)).toEqual(['A', 'B'])
    expect(
      state.mechanism.config.mechanism.reactions.some((r) => r.name === 'stale-reaction')
    ).toBe(false)
    expect(state.simulation.status).toBe('idle')
  })
})

describe('loadMusicBoxConfig with an invalid mechanism', () => {
  it('rejects with the parser message and leaves the current state unchanged', async () => {
    const store = makeStore()
    store.dispatch(addSpecies({ name: 'Existing', phase: 'gas' }))
    const invalid = baseConfig({
      mechanism: {
        ...baseConfig().mechanism,
        reactions: [
          {
            type: 'ARRHENIUS',
            'gas phase': 'gas',
            reactants: [{ name: 'UNDECLARED' }],
            products: [],
          },
        ],
      },
    })

    await expect(
      loadMusicBoxConfig(invalid, { dispatch: store.dispatch, navigate: vi.fn(), meta: {} })
    ).rejects.toThrow(/UNDECLARED/)
    expect(store.getState().mechanism.config.mechanism.species.map((s) => s.name)).toEqual([
      'Existing',
    ])
  })
})

describe('toReduxConfig', () => {
  it('parses the mechanism, so legacy "species name" components use the canonical name key', async () => {
    const config = {
      mechanism: {
        name: 'Test Mechanism',
        version: '1.0.0',
        species: [{ name: 'A' }, { name: 'C' }],
        phases: [{ name: 'gas', species: [{ name: 'A' }, { name: 'C' }] }],
        reactions: [
          {
            type: 'ARRHENIUS',
            'gas phase': 'gas',
            reactants: [{ 'species name': 'A', coefficient: 2, __note: 'kept' }],
            products: [{ name: 'C' }],
          },
        ],
      },
    }

    const [reaction] = (await toReduxConfig(config)).mechanism.reactions

    expect(reaction.reactants).toEqual([{ name: 'A', coefficient: 2, __note: 'kept' }])
    expect(reaction.products).toEqual([{ name: 'C', coefficient: 1 }])
  })
})

describe('notifyLoadedConditionsIssues', () => {
  it('warns about the rate parameters that name no reaction', () => {
    const notify = { warning: vi.fn() }
    notifyLoadedConditionsIssues(notify, {
      ignoredThirdBodySpecies: [],
      unmatchedRateParameters: ['PHOTO.x.s-1'],
    })
    expect(notify.warning).toHaveBeenCalledTimes(1)
    expect(notify.warning).toHaveBeenCalledWith(
      'Rate Parameters Ignored',
      'PHOTO.x.s-1 names no reaction of the mechanism, so the values were not loaded.'
    )
  })
})

describe('notifyIgnoredThirdBodySpecies', () => {
  it('warns with the species and the reason', () => {
    const notify = { warning: vi.fn() }
    notifyIgnoredThirdBodySpecies(notify, ['M'])
    expect(notify.warning).toHaveBeenCalledWith(
      'Third-Body Concentrations Ignored',
      expect.stringMatching(/for M\. This is a third-body species: .*air density/)
    )
  })

  it('does not warn when nothing was ignored', () => {
    const notify = { warning: vi.fn() }
    notifyIgnoredThirdBodySpecies(notify, [])
    expect(notify.warning).not.toHaveBeenCalled()
  })
})
