import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen, fireEvent, within } from '@testing-library/react'

import mechanismReducer, { setConfig } from '../src/redux/slices/mechanismSlice'
import conditionsReducer, { setConditionsTable } from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { SpeciesEditor } from '../src/components/Mechanism/SpeciesEditor'

const toast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

const renderEditor = () => {
  const store = configureStore({
    reducer: { mechanism: mechanismReducer, conditions: conditionsReducer, simulation: simulationReducer },
  })
  store.dispatch(
    setConfig({
      mechanism: {
        // D is in no reaction.
        species: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }],
        phases: [
          { name: 'gas', species: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }] },
        ],
        reactions: [
          { id: 'r1', type: 'PHOTOLYSIS', name: 'jA', reactants: [{ name: 'A' }], products: [{ name: 'B' }] },
          { id: 'r2', type: 'ARRHENIUS', reactants: [{ name: 'B' }], products: [{ name: 'C' }] },
        ],
      },
    })
  )
  const idOf = (name) => store.getState().mechanism.config.mechanism.species.find((s) => s.name === name).id
  store.dispatch(
    setConditionsTable({
      times: [0],
      columns: { [`CONC#${idOf('A')}`]: [1], [`CONC#${idOf('C')}`]: [2], 'PHOTO#r1': [1e-4] },
    })
  )
  render(
    <Provider store={store}>
      <SpeciesEditor />
    </Provider>
  )
  return { store, idOf }
}

// Each species row has its own Remove button.
const startRemoving = (name) => {
  fireEvent.click(screen.getByRole('button', { name: `Remove ${name}` }))
  return screen.getByRole('dialog', { name: `Remove ${name}?` })
}

const mechanismOf = (store) => store.getState().mechanism.config.mechanism

describe('removing a species', () => {
  it('asks first, and lists the reactions that use the species', () => {
    renderEditor()
    const dialog = startRemoving('A')
    expect(dialog).toHaveTextContent('1 reaction uses A. It will also be removed:')
    expect(dialog).toHaveTextContent('jA: A -> B')
    expect(within(dialog).getByRole('button', { name: 'Remove species and 1 reaction' })).toBeInTheDocument()
  })

  it('changes nothing when the user cancels', () => {
    const { store } = renderEditor()
    fireEvent.click(within(startRemoving('A')).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mechanismOf(store).species).toHaveLength(4)
    expect(mechanismOf(store).reactions).toHaveLength(2)
  })

  it('removes the species, its reactions and their conditions', () => {
    const { store, idOf } = renderEditor()
    const cId = idOf('C')
    fireEvent.click(within(startRemoving('A')).getByRole('button', { name: 'Remove species and 1 reaction' }))

    expect(mechanismOf(store).species.map((s) => s.name)).toEqual(['B', 'C', 'D'])
    expect(mechanismOf(store).reactions.map((r) => r.id)).toEqual(['r2'])
    // A's concentration and jA's rate parameter are gone; C's concentration stays.
    expect(store.getState().conditions.table.columns).toEqual({ [`CONC#${cId}`]: [2] })
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Species Removed',
        description: '"A" was removed from the mechanism, with the 1 reaction that used it.',
      })
    )
  })

  it('lists every reaction that uses the species, as a reactant or a product', () => {
    renderEditor()
    const dialog = startRemoving('B')
    expect(dialog).toHaveTextContent('2 reactions use B. They will also be removed:')
    expect(dialog).toHaveTextContent('jA: A -> B')
    expect(dialog).toHaveTextContent('B -> C')
  })

  it('says so when no reaction uses the species', () => {
    const { store } = renderEditor()
    const dialog = startRemoving('D')
    expect(dialog).toHaveTextContent('No reaction uses D.')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove species' }))
    expect(mechanismOf(store).species.map((s) => s.name)).toEqual(['A', 'B', 'C'])
    expect(mechanismOf(store).reactions).toHaveLength(2)
  })
})
