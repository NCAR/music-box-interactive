import { describe, it, expect, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'

import mechanismReducer, { addSpecies, addReaction } from '../../../src/redux/slices/mechanismSlice'
import conditionsReducer from '../../../src/redux/slices/conditionsSlice'
import simulationReducer, { setStatus } from '../../../src/redux/slices/simulationSlice'
import { loadMusicBoxConfig } from '../../../src/services/config/loadMusicBoxConfig'

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
      { name: 'A', type: 'CHEM_SPEC' },
      {
        name: 'B',
        type: 'CHEM_SPEC',
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
      { type: 'ARRHENIUS', name: 'r1', reactants: [{ 'species name': 'A' }], products: [] },
      { type: 'ARRHENIUS', reactants: [{ 'species name': 'B' }], products: [] },
    ],
  },
  ...overrides,
})

const load = (config, meta = {}) => {
  const store = makeStore()
  const navigate = vi.fn()
  loadMusicBoxConfig(config, { dispatch: store.dispatch, navigate, meta })
  return { store, navigate }
}

describe('loadMusicBoxConfig', () => {
  it('loads species with their declared properties', () => {
    const { store } = load(baseConfig())
    const species = store.getState().mechanism.species

    expect(species).toHaveLength(2)
    const a = species.find((s) => s.name === 'A')
    const b = species.find((s) => s.name === 'B')
    expect(a.phase).toBe('Gas')
    expect(b['absolute tolerance']).toBe(1e-12)
    expect(b['is third body']).toBe(true)
  })

  it('merges phase-only properties (diffusion coefficient, density) onto the matching species', () => {
    const { store } = load(baseConfig())
    const b = store.getState().mechanism.species.find((s) => s.name === 'B')

    expect(b['diffusion coefficient [m2 s-1]']).toBe(1e-5)
    expect(b['density [kg m-3]']).toBe(1000)
    // A has no phase-carried properties in the fixture, so none should appear.
    const a = store.getState().mechanism.species.find((s) => s.name === 'A')
    expect(a['diffusion coefficient [m2 s-1]']).toBeUndefined()
  })

  it('keeps a declared reaction name and generates one for an unnamed reaction', () => {
    const { store } = load(baseConfig())
    const reactions = store.getState().mechanism.reactions

    expect(reactions[0].name).toBe('r1')
    expect(reactions[1].name).toMatch(/->/)
    expect(reactions.every((r) => typeof r.id === 'string' && r.id.length > 0)).toBe(true)
  })

  it('converts box model options into seconds in the conditions slice', () => {
    const { store } = load(baseConfig())
    const { basic } = store.getState().conditions

    expect(basic.timeStep).toBe(2)
    expect(basic.outputFrequency).toBe(4)
    expect(basic.duration).toBe(100)
  })

  it('stores the raw conditions and the full uploaded config', () => {
    const config = baseConfig()
    const { store } = load(config)

    expect(store.getState().conditions.conditions).toEqual(config.conditions)
    expect(store.getState().mechanism.mechanism).toEqual(config)
  })

  it('sets the source file when the config declares one, and clears it when it does not', () => {
    const withSource = load(baseConfig({ '__source file': 'my_config.json' }))
    expect(withSource.store.getState().conditions.source_file).toBe('my_config.json')

    const withoutSource = load(baseConfig())
    expect(withoutSource.store.getState().conditions.source_file).toBeNull()
  })

  it('records the passed-in example metadata and marks the example as not yet loaded', () => {
    const meta = { id: 'chapman', name: 'Chapman', description: 'desc', mechanism_name: 'Chapman Mechanism' }
    const { store } = load(baseConfig(), meta)
    const state = store.getState()

    expect(state.mechanism.currentExample).toEqual(meta)
    expect(state.mechanism.selectedMechanism).toBe('Chapman Mechanism')
    expect(state.conditions.exampleLoaded).toBe(false)
  })

  it('falls back to the example id, then "custom", when no mechanism_name is given', () => {
    expect(load(baseConfig(), { id: 'uploaded' }).store.getState().mechanism.selectedMechanism).toBe(
      'uploaded'
    )
    expect(load(baseConfig(), {}).store.getState().mechanism.selectedMechanism).toBe('custom')
  })

  it('navigates to /mechanism after loading', () => {
    const { navigate } = load(baseConfig())
    expect(navigate).toHaveBeenCalledWith('/mechanism')
  })

  it('replaces stale state instead of appending to it', () => {
    const store = makeStore()
    store.dispatch(addSpecies({ name: 'Stale', phase: 'Gas' }))
    store.dispatch(addReaction({ type: 'ARRHENIUS', name: 'stale-reaction', id: 'stale-id' }))
    store.dispatch(setStatus('succeeded'))

    loadMusicBoxConfig(baseConfig(), { dispatch: store.dispatch, navigate: vi.fn(), meta: {} })
    const state = store.getState()

    expect(state.mechanism.species.map((s) => s.name)).toEqual(['A', 'B'])
    expect(state.mechanism.reactions.some((r) => r.name === 'stale-reaction')).toBe(false)
    expect(state.simulation.status).toBe('idle')
  })
})
