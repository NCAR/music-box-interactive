import { describe, it, expect } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'

import mechanismReducer, {
  addReaction,
  removeSpecies,
  selectNamedMechanism,
  setConfig,
  updateSpecies,
} from '../src/redux/slices/mechanismSlice'
import conditionsReducer, { setConditionsTable } from '../src/redux/slices/conditionsSlice'
import {
  toConfigMechanism,
  withSpeciesIds,
  withSpeciesNames,
} from '../src/services/mechanism/speciesIds'
import { buildLocalSimulationPayload } from '../src/services/simulation/local/payload'
import { buildDownloadableConfig } from '../src/services/config/downloadConfig'

const nameBased = () => ({
  name: 'test',
  version: '1.0.0',
  species: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
  phases: [{ name: 'gas', species: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] }],
  reactions: [
    {
      id: 'r1',
      type: 'ARRHENIUS',
      'gas phase': 'gas',
      reactants: [{ name: 'A', coefficient: 2 }],
      products: [{ name: 'B', coefficient: 1 }],
    },
    {
      id: 'r2',
      type: 'SURFACE',
      'gas phase': 'gas',
      'gas-phase species': 'C',
      'gas-phase products': [{ name: 'A', coefficient: 1 }],
    },
  ],
})

describe('withSpeciesIds and withSpeciesNames', () => {
  it('refers to every species by id, and gives the same names back', () => {
    const withIds = withSpeciesIds(nameBased())
    const id = (name) => withIds.species.find((s) => s.name === name).id

    expect(withIds.species.every((s) => typeof s.id === 'string')).toBe(true)
    expect(withIds.reactions[0].reactants).toEqual([{ speciesId: id('A'), coefficient: 2 }])
    expect(withIds.reactions[1]['gas-phase species id']).toBe(id('C'))
    expect(withIds.reactions[1]['gas-phase species']).toBeUndefined()
    expect(withIds.phases[0].species).toEqual([
      { speciesId: id('A') },
      { speciesId: id('B') },
      { speciesId: id('C') },
    ])

    // The named view has the same shape as the input, plus the species ids.
    const named = withSpeciesNames(withIds)
    expect(named.reactions).toEqual(nameBased().reactions)
    expect(named.phases).toEqual(nameBased().phases)
  })

  it('keeps existing ids when it runs again', () => {
    const once = withSpeciesIds(nameBased())
    expect(withSpeciesIds(once)).toEqual(once)
  })

  it('leaves a name that matches no species as it is', () => {
    const mechanism = nameBased()
    mechanism.reactions[0].products = [{ name: 'XYZ', coefficient: 1 }]
    expect(withSpeciesIds(mechanism).reactions[0].products).toEqual([{ name: 'XYZ', coefficient: 1 }])
  })

  it('gives the configuration species names and no species ids', () => {
    const config = toConfigMechanism(withSpeciesIds(nameBased()))
    expect(config.species).toEqual(nameBased().species)
    expect(JSON.stringify(config)).not.toMatch(/speciesId|species id/)
  })
})

describe('a species rename in the app', () => {
  const renameA = () => {
    const store = configureStore({ reducer: { mechanism: mechanismReducer, conditions: conditionsReducer } })
    store.dispatch(setConfig({ mechanism: nameBased() }))
    const a = store.getState().mechanism.config.mechanism.species.find((s) => s.name === 'A')
    store.dispatch(
      setConditionsTable({ times: [0], columns: { [`CONC#${a.id}`]: [1e-6] } })
    )
    store.dispatch(updateSpecies({ ...a, name: 'A2', phase: 'gas' }))
    return { store, a }
  }

  it('renames the species in its reactions and phases, through the id', () => {
    const { store } = renameA()
    const named = selectNamedMechanism(store.getState())
    expect(named.reactions[0].reactants).toEqual([{ name: 'A2', coefficient: 2 }])
    expect(named.reactions[1]['gas-phase products']).toEqual([{ name: 'A2', coefficient: 1 }])
    expect(named.phases[0].species.map((e) => e.name)).toEqual(['A2', 'B', 'C'])
  })

  it('writes the new name in the configuration, with its concentration', () => {
    const { store } = renameA()
    const { mechanism, conditions } = store.getState()
    const config = buildDownloadableConfig({
      mechanism,
      conditions: { ...conditions, basic: { timeStep: 1, outputFrequency: 1, duration: 1 } },
    })

    expect(config.mechanism.species.map((s) => s.name)).toEqual(['A2', 'B', 'C'])
    expect(config.mechanism.reactions[0].reactants[0].name).toBe('A2')
    const headers = config.conditions.data.flatMap((block) => block.headers)
    expect(headers).toContain('CONC.A2.mol m-3')
    expect(headers).not.toContain('CONC.A.mol m-3')
    expect(JSON.stringify(config)).not.toMatch(/speciesId|CONC#/)
  })

  it('stores a reaction from the add form with species ids', () => {
    const { store } = renameA()
    store.dispatch(
      addReaction({ id: 'r3', type: 'ARRHENIUS', reactants: [{ name: 'B' }], products: [{ name: 'A2' }] })
    )
    const stored = store.getState().mechanism.config.mechanism.reactions.find((r) => r.id === 'r3')
    expect(stored.reactants[0].speciesId).toBeDefined()
    expect(stored.products[0].name).toBeUndefined()
  })

  it('removes the concentration column with the species', () => {
    const { store, a } = renameA()
    store.dispatch(removeSpecies(a.id))
    expect(store.getState().conditions.table.columns).toEqual({})
  })
})

describe('the solver payload', () => {
  it('has species names and no UI ids', () => {
    const mechanism = withSpeciesIds(nameBased())
    const { payload } = buildLocalSimulationPayload({
      mechanismData: { config: { mechanism } },
      conditions: { basic: { timeStep: 1, outputFrequency: 1, duration: 1 }, table: { times: [], columns: {} } },
    })
    expect(payload.mechanism.species.every((s) => !('id' in s))).toBe(true)
    expect(JSON.stringify(payload)).not.toMatch(/speciesId|species id/)
  })
})
