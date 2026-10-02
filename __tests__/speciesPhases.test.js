import { describe, it, expect } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import mechanismReducer, {
  addSpecies,
  removeSpecies,
  selectNamedMechanism,
  setConfig,
  updateSpecies,
} from '../src/redux/slices/mechanismSlice'
import { withPhaseInfo } from '../src/services/simulation/local/mechanism'
import { withSpeciesIds } from '../src/services/mechanism/speciesIds'

const DIFFUSION = 'diffusion coefficient [m2 s-1]'
const DENSITY = 'density [kg m-3]'

const makeStore = (mechanism) => {
  const store = configureStore({ reducer: { mechanism: mechanismReducer } })
  store.dispatch(setConfig({ mechanism }))
  return store
}

const mechanismOf = (store) => store.getState().mechanism.config.mechanism
const idOf = (store, name) => mechanismOf(store).species.find((s) => s.name === name).id
const speciesNamed = (store, name) => mechanismOf(store).species.find((s) => s.name === name)

// Phase membership by species name, read through the name-based view.
const membership = (store) =>
  Object.fromEntries(
    selectNamedMechanism(store.getState()).phases.map((p) => [p.name, p.species.map((e) => e.name)])
  )

// A phase entry without its species id, which is a random uuid.
const entryFields = ({ speciesId: _id, ...fields }) => fields

const twoPhases = () => ({
  species: [{ name: 'A' }, { name: 'B' }],
  phases: [
    { name: 'gas', species: [{ name: 'A' }] },
    { name: 'aqueous', species: [{ name: 'B', [DENSITY]: 1000 }] },
  ],
  reactions: [],
})

describe('species phases in Redux', () => {
  it('gives every species an id, and phase entries refer to it', () => {
    const store = makeStore(twoPhases())
    const { species, phases } = mechanismOf(store)
    expect(species.every((s) => typeof s.id === 'string' && s.id.length > 0)).toBe(true)
    expect(phases[1].species[0]).toEqual({ speciesId: idOf(store, 'B'), [DENSITY]: 1000 })
  })

  it('adds a species to its phase and keeps phase-only properties on the phase entry', () => {
    const store = makeStore(twoPhases())
    store.dispatch(addSpecies({ name: 'C', phase: 'gas', [DIFFUSION]: 2e-5, 'is third body': true }))

    expect(membership(store)).toEqual({ gas: ['A', 'C'], aqueous: ['B'] })
    expect(speciesNamed(store, 'C')).toEqual({ id: idOf(store, 'C'), name: 'C', 'is third body': true })
    expect(mechanismOf(store).phases[0].species.at(-1)).toEqual({
      speciesId: idOf(store, 'C'),
      [DIFFUSION]: 2e-5,
    })
  })

  it('adds a phase that no species used before', () => {
    const store = makeStore(twoPhases())
    store.dispatch(addSpecies({ name: 'D', phase: 'organic' }))

    expect(membership(store)).toEqual({ gas: ['A'], aqueous: ['B'], organic: ['D'] })
  })

  it('sets and clears a phase-only property on the phase entry', () => {
    const store = makeStore(twoPhases())
    const id = idOf(store, 'B')
    store.dispatch(updateSpecies({ id, name: 'B', phase: 'aqueous', [DENSITY]: 1000, [DIFFUSION]: 3e-5 }))
    expect(entryFields(mechanismOf(store).phases[1].species[0])).toEqual({
      [DENSITY]: 1000,
      [DIFFUSION]: 3e-5,
    })

    store.dispatch(updateSpecies({ id, name: 'B', phase: 'aqueous' }))
    expect(mechanismOf(store).phases[1].species[0]).toEqual({ speciesId: id })
  })

  it('moves a species to another phase with its phase-only properties', () => {
    const store = makeStore(twoPhases())
    store.dispatch(updateSpecies({ id: idOf(store, 'B'), name: 'B', phase: 'gas', [DENSITY]: 1000 }))

    expect(membership(store)).toEqual({ gas: ['A', 'B'], aqueous: [] })
    expect(entryFields(mechanismOf(store).phases[0].species[1])).toEqual({ [DENSITY]: 1000 })
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
    store.dispatch(updateSpecies({ id: idOf(store, 'A'), name: 'A', phase: 'organic' }))

    expect(membership(store)).toEqual({ gas: [], aqueous: ['A'], organic: ['A'] })
  })

  it('renames a species without breaking its phase or its reactions', () => {
    const store = makeStore({
      species: [{ name: 'A' }, { name: 'B' }],
      phases: [{ name: 'gas', species: [{ name: 'A' }, { name: 'B' }] }],
      reactions: [{ id: 'r1', type: 'ARRHENIUS', reactants: [{ name: 'A' }], products: [{ name: 'B' }] }],
    })
    store.dispatch(updateSpecies({ id: idOf(store, 'A'), name: 'A2', phase: 'gas' }))

    const named = selectNamedMechanism(store.getState())
    expect(membership(store)).toEqual({ gas: ['A2', 'B'] })
    expect(named.reactions[0].reactants).toEqual([{ name: 'A2' }])
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
    store.dispatch(removeSpecies(idOf(store, 'A')))

    expect(mechanismOf(store).species.map((s) => s.name)).toEqual(['B'])
    expect(membership(store)).toEqual({ gas: ['B'], aqueous: [] })
  })
})

describe('withPhaseInfo', () => {
  it('gives each species its first phase and that phase entry’s phase-only properties', () => {
    const { species, phases } = withSpeciesIds(twoPhases())
    expect(withPhaseInfo(species, phases)).toEqual([
      { id: species[0].id, name: 'A', phase: 'gas' },
      { id: species[1].id, name: 'B', phase: 'aqueous', [DENSITY]: 1000 },
    ])
  })
})
