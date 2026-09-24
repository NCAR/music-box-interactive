import { describe, it, expect } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import mechanismReducer, {
  addSpecies,
  removeSpecies,
  setConfig,
  updateSpecies,
} from '../src/redux/slices/mechanismSlice'
import { withPhaseInfo } from '../src/services/simulation/local/mechanism'

const DIFFUSION = 'diffusion coefficient [m2 s-1]'
const DENSITY = 'density [kg m-3]'

const makeStore = (mechanism) => {
  const store = configureStore({ reducer: { mechanism: mechanismReducer } })
  store.dispatch(setConfig({ mechanism }))
  return store
}

const mechanismOf = (store) => store.getState().mechanism.config.mechanism
const membership = (store) =>
  Object.fromEntries(mechanismOf(store).phases.map((p) => [p.name, p.species.map((e) => e.name)]))

const twoPhases = () => ({
  species: [{ name: 'A' }, { name: 'B' }],
  phases: [
    { name: 'gas', species: [{ name: 'A' }] },
    { name: 'aqueous', species: [{ name: 'B', [DENSITY]: 1000 }] },
  ],
  reactions: [],
})

describe('species phases in Redux', () => {
  it('adds a species to its phase and keeps phase-only properties on the phase entry', () => {
    const store = makeStore(twoPhases())
    store.dispatch(addSpecies({ name: 'C', phase: 'gas', [DIFFUSION]: 2e-5, 'is third body': true }))

    expect(membership(store)).toEqual({ gas: ['A', 'C'], aqueous: ['B'] })
    expect(mechanismOf(store).species.at(-1)).toEqual({ name: 'C', 'is third body': true })
    expect(mechanismOf(store).phases[0].species.at(-1)).toEqual({ name: 'C', [DIFFUSION]: 2e-5 })
  })

  it('adds a phase that no species used before', () => {
    const store = makeStore(twoPhases())
    store.dispatch(addSpecies({ name: 'D', phase: 'organic' }))

    expect(membership(store)).toEqual({ gas: ['A'], aqueous: ['B'], organic: ['D'] })
  })

  it('sets and clears a phase-only property on the phase entry', () => {
    const store = makeStore(twoPhases())
    store.dispatch(updateSpecies({ name: 'B', phase: 'aqueous', [DENSITY]: 1000, [DIFFUSION]: 3e-5 }))
    expect(mechanismOf(store).phases[1].species[0]).toEqual({
      name: 'B',
      [DENSITY]: 1000,
      [DIFFUSION]: 3e-5,
    })

    store.dispatch(updateSpecies({ name: 'B', phase: 'aqueous' }))
    expect(mechanismOf(store).phases[1].species[0]).toEqual({ name: 'B' })
  })

  it('moves a species to another phase with its phase-only properties', () => {
    const store = makeStore(twoPhases())
    store.dispatch(updateSpecies({ name: 'B', phase: 'gas', [DENSITY]: 1000 }))

    expect(membership(store)).toEqual({ gas: ['A', 'B'], aqueous: [] })
    expect(mechanismOf(store).phases[0].species[1]).toEqual({ name: 'B', [DENSITY]: 1000 })
  })

  it('moves a species only out of the phase that the editor shows', () => {
    const store = makeStore({
      species: [{ name: 'A' }],
      phases: [
        { name: 'gas', species: [{ name: 'A' }] },
        { name: 'aqueous', species: [{ name: 'A' }] },
        { name: 'organic', species: [] },
      ],
      reactions: [],
    })
    store.dispatch(updateSpecies({ name: 'A', phase: 'organic' }))

    expect(membership(store)).toEqual({ gas: [], aqueous: ['A'], organic: ['A'] })
  })

  it('removes a species from the species list and from each phase', () => {
    const store = makeStore({
      species: [{ name: 'A' }, { name: 'B' }],
      phases: [
        { name: 'gas', species: [{ name: 'A' }, { name: 'B' }] },
        { name: 'aqueous', species: [{ name: 'A' }] },
      ],
      reactions: [],
    })
    store.dispatch(removeSpecies('A'))

    expect(mechanismOf(store).species).toEqual([{ name: 'B' }])
    expect(membership(store)).toEqual({ gas: ['B'], aqueous: [] })
  })
})

describe('withPhaseInfo', () => {
  it('gives each species its first phase and that phase entry’s phase-only properties', () => {
    const { species, phases } = twoPhases()
    expect(withPhaseInfo(species, phases)).toEqual([
      { name: 'A', phase: 'gas' },
      { name: 'B', phase: 'aqueous', [DENSITY]: 1000 },
    ])
  })
})
